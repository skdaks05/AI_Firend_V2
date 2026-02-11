import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import color from "picocolors";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { spawnVendor } from "../lib/process.js";

// Helper to check if process with PID is running
function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (_e) {
    return false;
  }
}

type UserPreferences = {
  default_cli?: string;
  agent_cli_mapping?: Record<string, string>;
};

type VendorConfig = {
  command?: string;
  subcommand?: string;
  prompt_flag?: string | null;
  auto_approve_flag?: string;
  output_format_flag?: string;
  output_format?: string;
  model_flag?: string;
  default_model?: string;
  isolation_env?: string;
  isolation_flags?: string;
  output_parser?: string;
};

type CliConfig = {
  active_vendor?: string;
  vendors: Record<string, VendorConfig>;
  loop_guard?: {
    max_retry?: number;
    max_wall_time_sec?: number;
  };
};

function splitArgs(value: string): string[] {
  const args: string[] = [];
  const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
  let match: RegExpExecArray | null = regex.exec(value);
  while (match !== null) {
    if (match[1] !== undefined) args.push(match[1]);
    else if (match[2] !== undefined) args.push(match[2]);
    else if (match[0]) args.push(match[0]);
    match = regex.exec(value);
  }
  return args;
}

const UserPreferencesSchema = z
  .object({
    default_cli: z.string().optional(),
    agent_cli_mapping: z.record(z.string(), z.string()).optional(),
  })
  .passthrough()
  .transform((value) => ({
    default_cli: value.default_cli,
    agent_cli_mapping: value.agent_cli_mapping ?? {},
  }));

const VendorConfigSchema = z
  .object({
    command: z.string().optional(),
    subcommand: z.string().optional(),
    /**
     * prompt_flag — 3-value semantics (do NOT collapse):
     *
     *   undefined  = key absent in config → resolvePromptFlag() uses vendor default
     *   null       = "none" / "null" / "" in config → prompt flag disabled (arg omitted)
     *   string     = explicit flag value (e.g. "-p")
     *
     * The transform below converts YAML sentinel strings to null while
     * preserving undefined (key absent) as-is.
     */
    prompt_flag: z
      .string()
      .optional()
      .transform((value) => {
        if (value === undefined) return undefined;
        const normalized = value.trim().toLowerCase();
        if (
          normalized === "" ||
          normalized === "none" ||
          normalized === "null"
        ) {
          return null;
        }
        return value;
      }),
    auto_approve_flag: z.string().optional(),
    output_format_flag: z.string().optional(),
    output_format: z.string().optional(),
    model_flag: z.string().optional(),
    default_model: z.string().optional(),
    isolation_env: z.string().optional(),
    isolation_flags: z.string().optional(),
    output_parser: z.string().optional(),
  })
  .passthrough()
  .transform((value) => {
    // Backward-compat shim: response_jq → output_parser (1-release transition)
    // Normalizes jq expressions to vendor parser keys
    const JQ_TO_PARSER: Record<string, string> = {
      ".response": "gemini", // gemini uses json.response
      ".result": "claude",   // claude uses json.result
      ".output": "qwen",     // qwen uses json.output
    };
    const raw = value as Record<string, unknown>;
    if (raw.response_jq && !value.output_parser) {
      if (process.env.NODE_ENV !== "test") {
        console.warn(
          color.yellow("[DEPRECATED] response_jq → output_parser로 이전하세요"),
        );
      }
      const jqVal = String(raw.response_jq);
      value.output_parser = JQ_TO_PARSER[jqVal] ?? jqVal;
    }
    return {
      ...value,
      prompt_flag: value.prompt_flag,
    };
  });

const LoopGuardSchema = z
  .object({
    max_retry: z.number().int().min(0).default(3),
    max_wall_time_sec: z.number().int().min(0).default(3600),
  })
  .optional();

const CliConfigSchema = z
  .object({
    active_vendor: z.string().optional(),
    vendors: z.record(z.string(), VendorConfigSchema).optional(),
    loop_guard: LoopGuardSchema,
  })
  .passthrough()
  .transform((value) => ({
    active_vendor: value.active_vendor,
    vendors: value.vendors ?? {},
    loop_guard: value.loop_guard,
  }));

function parseYamlValue(content: string): unknown {
  try {
    return parseYaml(content);
  } catch {
    return null;
  }
}

function parseUserPreferences(content: string): UserPreferences {
  const parsed = parseYamlValue(content);
  const result = UserPreferencesSchema.safeParse(parsed);
  if (!result.success) return {};
  return result.data;
}

function parseCliConfig(content: string): CliConfig {
  const parsed = parseYamlValue(content);
  const result = CliConfigSchema.safeParse(parsed);
  if (!result.success) return { vendors: {} };

  if (process.env.OH_MY_AG_DEBUG_PARSE === "1") {
    console.log(
      color.dim(
        `  Parse Debug vendors.gemini=${JSON.stringify(result.data.vendors?.gemini)}`,
      ),
    );
  }

  const vendors: Record<string, VendorConfig> = {};
  for (const [vendor, cfg] of Object.entries(result.data.vendors)) {
    vendors[vendor] = { ...cfg };
  }

  return result.data;
}

/**
 * Walk up from `startDir` looking for the `.agent/` directory marker.
 * Returns the directory that contains `.agent/`, or `startDir` as fallback.
 */
function findProjectRoot(startDir: string): string {
  let dir = path.resolve(startDir);
  const { root } = path.parse(dir);
  while (dir !== root) {
    if (fs.existsSync(path.join(dir, ".agent"))) return dir;
    dir = path.dirname(dir);
  }
  // Last check at filesystem root
  if (fs.existsSync(path.join(dir, ".agent"))) return dir;
  return path.resolve(startDir);
}

function readUserPreferences(cwd: string): UserPreferences | null {
  const configPath = path.join(
    cwd,
    ".agent",
    "config",
    "user-preferences.yaml",
  );
  if (!fs.existsSync(configPath)) return null;
  try {
    const content = fs.readFileSync(configPath, "utf-8");
    return parseUserPreferences(content);
  } catch {
    return null;
  }
}

function readCliConfig(cwd: string): CliConfig | null {
  const configPath = path.join(
    cwd,
    ".agent",
    "skills",
    "orchestrator",
    "config",
    "cli-config.yaml",
  );
  if (!fs.existsSync(configPath)) return null;
  try {
    const content = fs.readFileSync(configPath, "utf-8");
    return parseCliConfig(content);
  } catch {
    return null;
  }
}

function resolveVendor(
  agentId: string,
  vendorOverride?: string,
): { vendor: string; config: CliConfig | null } {
  const projectRoot = findProjectRoot(process.cwd());
  const userPrefs = readUserPreferences(projectRoot);
  const cliConfig = readCliConfig(projectRoot);

  if (!cliConfig) {
    console.warn(
      `[warn] cli-config.yaml not found (searched upward from ${process.cwd()})`,
    );
  }

  const normalizedAgentId = agentId.replace(/-agent$/i, "");
  const mappedVendor =
    userPrefs?.agent_cli_mapping?.[agentId] ||
    userPrefs?.agent_cli_mapping?.[normalizedAgentId];
  const vendor =
    vendorOverride ||
    mappedVendor ||
    userPrefs?.default_cli ||
    cliConfig?.active_vendor ||
    "gemini";

  return { vendor: vendor.toLowerCase(), config: cliConfig };
}

/**
 * Resolve the prompt flag for a vendor CLI invocation.
 *
 * @param vendor    - Resolved vendor name (gemini, claude, codex, qwen)
 * @param promptFlag - From VendorConfigSchema transform:
 *   - `undefined` → config key absent → use vendor default below
 *   - `null`      → config was "none"/"null"/"" → disable prompt flag (omit arg)
 *   - `string`    → explicit flag (e.g. "-p") → use as-is
 * @returns The flag string to prepend before prompt content, or null to omit.
 */
function resolvePromptFlag(
  vendor: string,
  promptFlag?: string | null,
): string | null {
  if (promptFlag !== undefined) {
    return promptFlag;
  }

  const defaults: Record<string, string | null> = {
    gemini: "-p",
    claude: "-p",
    qwen: "-p",
    codex: null,
  };

  return Object.hasOwn(defaults, vendor) ? defaults[vendor] : "-p";
}

// ============================================================================
// Monorepo Workspace Detection
// ============================================================================

/**
 * Keywords to match workspace directories to agent types.
 * Order matters - first match wins.
 */
const AGENT_WORKSPACE_KEYWORDS: Record<string, string[]> = {
  frontend: [
    "web",
    "frontend",
    "client",
    "ui",
    "app",
    "dashboard",
    "admin",
    "portal",
  ],
  backend: ["api", "backend", "server", "service", "gateway", "core"],
  mobile: ["mobile", "ios", "android", "native", "rn", "expo"],
};

/**
 * Fallback candidates when no monorepo config is found.
 */
const WORKSPACE_CANDIDATES: Record<string, string[]> = {
  frontend: [
    "apps/web",
    "apps/frontend",
    "apps/client",
    "packages/web",
    "packages/frontend",
    "frontend",
    "web",
    "client",
  ],
  backend: [
    "apps/api",
    "apps/backend",
    "apps/server",
    "packages/api",
    "packages/backend",
    "backend",
    "api",
    "server",
  ],
  mobile: ["apps/mobile", "apps/app", "packages/mobile", "mobile", "app"],
};

/**
 * Expand simple glob patterns like "apps/*" or "packages/*".
 * Supports patterns ending with /* or /** (treated the same for top-level).
 */
function expandGlobPattern(pattern: string, cwd: string): string[] {
  // Handle negation patterns (skip them)
  if (pattern.startsWith("!")) {
    return [];
  }

  // Clean up pattern
  const cleanPattern = pattern.replace(/\/\*\*?$/, "").replace(/\/$/, "");

  // If no wildcard, it's a direct path
  if (!pattern.includes("*")) {
    const fullPath = path.join(cwd, cleanPattern);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      return [cleanPattern];
    }
    return [];
  }

  // Handle patterns like "apps/*" or "packages/*"
  const parentDir = path.join(cwd, cleanPattern);
  if (!fs.existsSync(parentDir) || !fs.statSync(parentDir).isDirectory()) {
    return [];
  }

  try {
    const entries = fs.readdirSync(parentDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => path.join(cleanPattern, entry.name));
  } catch {
    return [];
  }
}

/**
 * Parse pnpm-workspace.yaml to get workspace patterns.
 */
function parsePnpmWorkspace(cwd: string): string[] {
  const configPath = path.join(cwd, "pnpm-workspace.yaml");
  if (!fs.existsSync(configPath)) return [];

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const parsed = parseYaml(content) as { packages?: string[] };
    return parsed?.packages ?? [];
  } catch {
    return [];
  }
}

/**
 * Parse package.json workspaces field.
 * Supports both array format and object format with packages field.
 */
function parsePackageJsonWorkspaces(cwd: string): string[] {
  const configPath = path.join(cwd, "package.json");
  if (!fs.existsSync(configPath)) return [];

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content) as {
      workspaces?: string[] | { packages?: string[] };
    };

    if (Array.isArray(parsed?.workspaces)) {
      return parsed.workspaces;
    }
    if (parsed?.workspaces && typeof parsed.workspaces === "object") {
      return parsed.workspaces.packages ?? [];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Parse lerna.json packages field.
 */
function parseLernaConfig(cwd: string): string[] {
  const configPath = path.join(cwd, "lerna.json");
  if (!fs.existsSync(configPath)) return [];

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content) as { packages?: string[] };
    return parsed?.packages ?? [];
  } catch {
    return [];
  }
}

/**
 * Check if Nx monorepo (nx.json exists) - use standard Nx conventions.
 */
function detectNxWorkspaces(cwd: string): string[] {
  const configPath = path.join(cwd, "nx.json");
  if (!fs.existsSync(configPath)) return [];

  // Nx typically uses apps/* and libs/*
  const patterns = ["apps/*", "libs/*", "packages/*"];
  return patterns.flatMap((p) => expandGlobPattern(p, cwd));
}

/**
 * Check Turbo monorepo via turbo.json - use package.json workspaces.
 */
function detectTurboWorkspaces(cwd: string): string[] {
  const configPath = path.join(cwd, "turbo.json");
  if (!fs.existsSync(configPath)) return [];

  // Turbo uses package.json workspaces
  return parsePackageJsonWorkspaces(cwd);
}

/**
 * Parse mise.toml for project-specific workspace hints.
 */
function parseMiseConfig(cwd: string): string[] {
  const configPath = path.join(cwd, "mise.toml");
  if (!fs.existsSync(configPath)) return [];

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    // Look for [env] section with WORKSPACE patterns or custom keys
    // mise.toml is TOML, but we can do simple regex for common patterns
    const patterns: string[] = [];

    // Match lines like: workspaces = ["apps/*", "packages/*"]
    const workspacesMatch = content.match(/workspaces\s*=\s*\[([^\]]+)\]/);
    if (workspacesMatch?.[1]) {
      const items = workspacesMatch[1].match(/"([^"]+)"|'([^']+)'/g);
      if (items) {
        patterns.push(...items.map((s) => s.replace(/["']/g, "")));
      }
    }

    return patterns;
  } catch {
    return [];
  }
}

/**
 * Get all workspace directories from monorepo configuration files.
 * Checks: pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml
 */
function getMonorepoWorkspaces(cwd: string): string[] {
  const patterns = new Set<string>();

  // Priority order: pnpm > package.json > lerna > nx > turbo > mise
  const sources = [
    parsePnpmWorkspace(cwd),
    parsePackageJsonWorkspaces(cwd),
    parseLernaConfig(cwd),
    detectNxWorkspaces(cwd),
    detectTurboWorkspaces(cwd),
    parseMiseConfig(cwd),
  ];

  for (const source of sources) {
    for (const pattern of source) {
      patterns.add(pattern);
    }
  }

  // Expand all patterns to actual directories
  const workspaces = new Set<string>();
  for (const pattern of patterns) {
    for (const dir of expandGlobPattern(pattern, cwd)) {
      workspaces.add(dir);
    }
  }

  return [...workspaces];
}

/**
 * Match a workspace directory to an agent type based on keywords.
 * Returns a score (higher = better match).
 */
function scoreWorkspaceMatch(workspace: string, agentId: string): number {
  const keywords = AGENT_WORKSPACE_KEYWORDS[agentId];
  if (!keywords) return 0;

  const dirName = path.basename(workspace).toLowerCase();
  const fullPath = workspace.toLowerCase();

  for (let i = 0; i < keywords.length; i++) {
    const keyword = keywords[i];
    // Exact match on directory name gets highest score
    if (dirName === keyword) {
      return 100 - i;
    }
    // Directory name contains keyword
    if (dirName.includes(keyword)) {
      return 50 - i;
    }
    // Full path contains keyword (e.g., apps/web-admin)
    if (fullPath.includes(keyword)) {
      return 25 - i;
    }
  }

  return 0;
}

/**
 * Detect the best workspace for an agent type.
 * 1. First, try to detect from monorepo config files
 * 2. Fall back to hardcoded candidates
 */
function detectWorkspace(agentId: string): string {
  const cwd = process.cwd();

  // Try monorepo detection first
  const workspaces = getMonorepoWorkspaces(cwd);

  if (workspaces.length > 0) {
    // Score each workspace for this agent type
    const scored = workspaces
      .map((ws) => ({ workspace: ws, score: scoreWorkspaceMatch(ws, agentId) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
      return scored[0].workspace;
    }
  }

  // Fall back to hardcoded candidates
  const candidates = WORKSPACE_CANDIDATES[agentId];
  if (candidates) {
    for (const candidate of candidates) {
      const resolved = path.resolve(candidate);
      if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
        return candidate;
      }
    }
  }

  return ".";
}

function resolvePromptContent(prompt: string): string {
  const resolved = path.resolve(prompt);
  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
    return fs.readFileSync(resolved, "utf-8");
  }
  return prompt;
}

// ============================================================================
// Vendor-specific log parsers (adapter pattern)
// Each parser extracts the final response from a JSON log line.
// Returns the extracted string, or null to skip the line.
// ============================================================================

type VendorParser = (json: Record<string, unknown>) => string | null;

function stringify(val: unknown): string {
  return typeof val === "string" ? val : JSON.stringify(val);
}

/** Gemini: response field from JSON output */
function parseGeminiLine(json: Record<string, unknown>): string | null {
  if (json.response) return stringify(json.response);
  return null;
}

/** Claude: result field from JSON output */
function parseClaudeLine(json: Record<string, unknown>): string | null {
  if (json.result) return stringify(json.result);
  return null;
}

/** Codex: event stream (item.completed > agent_message) */
function parseCodexLine(json: Record<string, unknown>): string | null {
  if (
    json.type === "item.completed" &&
    (json.item as Record<string, unknown>)?.type === "agent_message" &&
    (json.item as Record<string, unknown>)?.text
  ) {
    return String((json.item as Record<string, unknown>).text);
  }
  if (json.type === "agent_message" && json.text) {
    return String(json.text);
  }
  if (json.response) return stringify(json.response);
  return null;
}

/** Qwen: output field from JSON output */
function parseQwenLine(json: Record<string, unknown>): string | null {
  if (json.output) return stringify(json.output);
  return null;
}

/** Default: tries all known patterns (original heuristic) */
function parseDefaultLine(json: Record<string, unknown>): string | null {
  return (
    parseCodexLine(json) ??
    parseClaudeLine(json) ??
    parseGeminiLine(json) ??
    parseQwenLine(json)
  );
}

const VENDOR_PARSERS: Record<string, VendorParser> = {
  gemini: parseGeminiLine,
  claude: parseClaudeLine,
  codex: parseCodexLine,
  qwen: parseQwenLine,
  default: parseDefaultLine,
};

function extractResultFromLog(logFile: string, outputParser?: string): string {
  if (!fs.existsSync(logFile)) return "No log file generated.";

  const parseFn: VendorParser =
    VENDOR_PARSERS[outputParser ?? "default"] ?? parseDefaultLine;

  try {
    const content = fs.readFileSync(logFile, "utf-8");
    const lines = content.split(/\r?\n/);

    let lastMessage = "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line) as Record<string, unknown>;
        const extracted = parseFn(json);
        if (extracted) lastMessage = extracted;
      } catch {
        // Not a JSON line, ignore
      }
    }

    if (lastMessage) return lastMessage;

    // Fallback: Return the whole content if no structured message found
    return content;
  } catch (e) {
    return `Error reading log: ${String(e)}`;
  }
}

export async function spawnAgent(
  agentId: string,
  prompt: string,
  sessionId: string,
  workspace: string,
  vendorOverride?: string,
) {
  const effectiveWorkspace =
    workspace === "." ? detectWorkspace(agentId) : workspace;
  const resolvedWorkspace = path.resolve(effectiveWorkspace);

  if (!fs.existsSync(resolvedWorkspace)) {
    fs.mkdirSync(resolvedWorkspace, { recursive: true });
    console.log(
      color.dim(`[${agentId}] Created workspace: ${resolvedWorkspace}`),
    );
  } else if (effectiveWorkspace !== workspace) {
    console.log(
      color.blue(`[${agentId}] Auto-detected workspace: ${effectiveWorkspace}`),
    );
  }

  const tmpDir = tmpdir();
  const logFile = path.join(tmpDir, `subagent-${sessionId}-${agentId}.log`);
  const pidFile = path.join(tmpDir, `subagent-${sessionId}-${agentId}.pid`);

  const promptContent = resolvePromptContent(prompt);

  const { vendor, config } = resolveVendor(agentId, vendorOverride);
  const vendorConfig = config?.vendors?.[vendor] || {};
  const command = vendorConfig.command || vendor;
  const subcommand = vendorConfig.subcommand;

  // Prepare log stream
  const logStream = fs.openSync(logFile, "w");

  console.log(color.blue(`[${agentId}] Spawning subagent...`));
  console.log(color.dim(`  Vendor: ${vendor}`));
  console.log(color.dim(`  Workspace: ${resolvedWorkspace}`));
  console.log(color.dim(`  Log: ${logFile}`));

  const optionArgs: string[] = [];
  const promptFlag = resolvePromptFlag(vendor, vendorConfig.prompt_flag);

  if (vendorConfig.output_format_flag && vendorConfig.output_format) {
    optionArgs.push(
      vendorConfig.output_format_flag,
      vendorConfig.output_format,
    );
  } else if (vendorConfig.output_format_flag) {
    optionArgs.push(vendorConfig.output_format_flag);
  }

  if (vendorConfig.model_flag && vendorConfig.default_model) {
    optionArgs.push(vendorConfig.model_flag, vendorConfig.default_model);
  }

  if (vendorConfig.isolation_flags) {
    optionArgs.push(...splitArgs(vendorConfig.isolation_flags));
  }

  if (vendorConfig.auto_approve_flag) {
    optionArgs.push(vendorConfig.auto_approve_flag);
  } else {
    const defaultAutoApprove: Record<string, string> = {
      gemini: "--approval-mode=yolo",
      codex: "--full-auto",
      qwen: "--yolo",
    };
    const fallbackFlag = defaultAutoApprove[vendor];
    if (fallbackFlag) {
      optionArgs.push(fallbackFlag);
    }
  }

  if (promptFlag) {
    optionArgs.push(promptFlag, promptContent);
  }

  const args: string[] = [];
  if (subcommand) args.push(subcommand);
  args.push(...optionArgs);
  if (!promptFlag) {
    args.push(promptContent);
  }

  if (process.env.OH_MY_AG_DEBUG_SPAWN === "1") {
    console.log(
      color.dim(
        `  Vendor Debug: requested=${JSON.stringify(vendorOverride || null)} resolved=${JSON.stringify(vendor)}`,
      ),
    );
    console.log(color.dim(`  Vendor Config: ${JSON.stringify(vendorConfig)}`));
    console.log(
      color.dim(`  Prompt Flag Resolved: ${JSON.stringify(promptFlag)}`),
    );
    console.log(color.dim(`  Command: ${command}`));
    console.log(color.dim(`  Args: ${JSON.stringify(args)}`));
  }

  const env = { ...process.env };
  if (vendorConfig.isolation_env) {
    const [key, ...rest] = vendorConfig.isolation_env.split("=");
    const rawValue = rest.join("=");
    if (key && rawValue) {
      env[key] = rawValue.replace("$$", String(process.pid));
    }
  }

  // Spawn selected CLI via process wrapper (isolates Bun/@types/node conflicts)
  let child: ReturnType<typeof spawnVendor>;
  try {
    child = spawnVendor(command, args, {
      cwd: resolvedWorkspace,
      stdio: ["ignore", logStream, logStream],
      detached: false,
      env,
      shell: process.platform === "win32" && vendor !== "codex",
    });
  } finally {
    // Close parent's copy of the log fd — child already has its own via dup2.
    // Must run even if spawnVendor throws (e.g. ENOENT) to prevent fd leak.
    fs.closeSync(logStream);
  }

  if (!child.pid) {
    console.error(color.red(`[${agentId}] Failed to spawn process`));
    process.exit(1);
  }

  // Write PID
  fs.writeFileSync(pidFile, child.pid.toString());
  console.log(color.green(`[${agentId}] Started with PID ${child.pid}`));

  // Loop Guard: wall_time timer (Contract 7)
  const wallTimeSec = config?.loop_guard?.max_wall_time_sec ?? 3600;
  let wallTimeAborted = false;
  let wallTimer: ReturnType<typeof setTimeout> | null = null;

  if (wallTimeSec > 0) {
    wallTimer = setTimeout(() => {
      wallTimeAborted = true;
      console.error(
        color.red(
          `[${agentId}] ABORTED: wall_time exceeded (${wallTimeSec}s limit)`,
        ),
      );
      child.kill();
    }, wallTimeSec * 1000);
  }

  const cleanup = () => {
    try {
      if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
    } catch (_e) {
      // ignore
    }
  };

  // Handle signals to kill child
  const cleanAndExit = () => {
    if (child.pid && isProcessRunning(child.pid)) {
      process.kill(child.pid);
    }
    cleanup();
    process.exit();
  };

  process.on("SIGINT", cleanAndExit);
  process.on("SIGTERM", cleanAndExit);

  // Handle spawn errors (e.g. ENOENT when command not found)
  child.on("error", (err: Error) => {
    console.error(color.red(`[${agentId}] Spawn error: ${err.message}`));
    cleanup();
    process.exit(1);
  });

  child.on("exit", (code: number | null) => {
    // Clear Loop Guard timer on normal exit
    if (wallTimer) clearTimeout(wallTimer);

    console.log(color.blue(`[${agentId}] Exited with code ${code}`));

    // Capture and save result
    const result = extractResultFromLog(logFile, vendorConfig.output_parser);
    const status = wallTimeAborted
      ? "aborted"
      : code === 0
        ? "completed"
        : "failed";
    const resultRoot = findProjectRoot(process.cwd());
    const resultFile = path.join(
      resultRoot,
      ".serena",
      "memories",
      `result-${agentId}.md`,
    );
    const historyFile = path.join(
      resultRoot,
      ".serena",
      "memories",
      `result-${agentId}.history.md`,
    );

    // Ensure memories directory exists
    const memoriesDir = path.dirname(resultFile);
    if (!fs.existsSync(memoriesDir)) {
      fs.mkdirSync(memoriesDir, { recursive: true });
    }

    // Snapshot + history: append existing content to history before overwriting
    if (fs.existsSync(resultFile)) {
      const prev = fs.readFileSync(resultFile, "utf-8");
      const timestamp = new Date().toISOString();
      const separator = `\n---\n_Archived: ${timestamp}_\n\n`;
      fs.appendFileSync(historyFile, separator + prev);
    }

    const abortNote = wallTimeAborted
      ? `\n\nABORTED: wall_time exceeded (${wallTimeSec}s limit)\n`
      : "";
    const markdownContent = `## Status: ${status}${abortNote}\n\n${result}`;
    fs.writeFileSync(resultFile, markdownContent);
    console.log(color.green(`[${agentId}] Result saved to ${resultFile}`));

    cleanup();
    process.exit(wallTimeAborted ? 1 : (code ?? 0));
  });
}

export async function checkStatus(
  sessionId: string,
  agentIds: string[],
  rootPath: string = findProjectRoot(process.cwd()),
) {
  const results: Record<string, string> = {};

  for (const agent of agentIds) {
    const resultFile = path.join(
      rootPath,
      ".serena",
      "memories",
      `result-${agent}.md`,
    );
    const pidFile = path.join(tmpdir(), `subagent-${sessionId}-${agent}.pid`);

    if (fs.existsSync(resultFile)) {
      const content = fs.readFileSync(resultFile, "utf-8");
      // grep "^## Status:" "$RESULT" | head -1 | awk '{print $3}'
      const match = content.match(/^## Status:\s*(\S+)/m);
      if (match?.[1]) {
        // Use the status from the file to be more precise if possible
        // But script logic was:
        // STATUS=$(grep "^## Status:" "$RESULT" | head -1 | awk '{print $3}')
        // echo "${agent}:${STATUS}"
        results[agent] = match[1];
      } else {
        results[agent] = `completed`; // Fallback if status header missing but file exists
      }
    } else if (fs.existsSync(pidFile)) {
      // Logic for checking PID
      const pidContent = fs.readFileSync(pidFile, "utf-8").trim();
      const pid = parseInt(pidContent, 10);
      if (!Number.isNaN(pid) && isProcessRunning(pid)) {
        results[agent] = "running";
      } else {
        results[agent] = "crashed";
      }
    } else {
      results[agent] = "crashed"; // or "not_started" but script says "crashed"
    }
  }

  // Output in format comparable to script: "agent:status"
  for (const [agent, status] of Object.entries(results)) {
    console.log(`${agent}:${status}`);
  }
}
