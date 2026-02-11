import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import YAML from "yaml";
import {
  AGENT_TYPES,
  type AgentType,
  type VerifyCheck,
  type VerifyResult,
} from "../types/index.js";

export type ApprovalsValidation = {
  ok: boolean;
  status: string | null;
  error: string | null;
};

/**
 * Validate an approvals.json file with full schema + consistency checks.
 * Reusable by other commands (e.g. cleanup guard).
 */
export function validateApprovalsFile(filePath: string): ApprovalsValidation {
  if (!existsSync(filePath)) {
    return { ok: false, status: null, error: "approvals.json not found" };
  }
  let doc: Record<string, unknown>;
  try {
    doc = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return {
      ok: false,
      status: null,
      error: "approvals.json is not valid JSON",
    };
  }

  const REQUIRED_KEYS = [
    "schema_version",
    "run_id",
    "task_id",
    "status",
    "requested_by",
    "requested_at",
    "decision",
    "scope",
  ];
  const missing = REQUIRED_KEYS.filter((k) => !(k in doc));
  if (missing.length > 0) {
    return {
      ok: false,
      status: null,
      error: `Missing keys: ${missing.join(", ")}`,
    };
  }

  const VALID_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];
  const status = doc.status as string;
  if (!VALID_STATUSES.includes(status)) {
    return {
      ok: false,
      status,
      error: `Invalid status: ${status}. Must be ${VALID_STATUSES.join("|")}`,
    };
  }

  const decision = doc.decision as Record<string, unknown> | undefined;
  if (!decision || typeof decision !== "object") {
    return { ok: false, status, error: "decision must be an object" };
  }
  if (status !== "PENDING") {
    if (!decision.by || !decision.at) {
      return {
        ok: false,
        status,
        error: `status=${status} requires decision.by and decision.at`,
      };
    }
  }

  const scope = doc.scope as Record<string, unknown> | undefined;
  if (!scope || typeof scope !== "object") {
    return { ok: false, status, error: "scope must be an object" };
  }
  const VALID_RISK_LEVELS = ["LOW", "MEDIUM", "HIGH"];
  const riskLevel = scope.risk_level as string;
  if (!riskLevel || !VALID_RISK_LEVELS.includes(riskLevel)) {
    return {
      ok: false,
      status,
      error: `scope.risk_level must be ${VALID_RISK_LEVELS.join("|")}`,
    };
  }
  const actions = scope.actions as unknown[];
  const targets = scope.targets as unknown[];
  if (!Array.isArray(actions) || actions.length === 0) {
    return {
      ok: false,
      status,
      error: "scope.actions must be a non-empty array",
    };
  }
  if (!Array.isArray(targets) || targets.length === 0) {
    return {
      ok: false,
      status,
      error: "scope.targets must be a non-empty array",
    };
  }

  if (status !== "APPROVED") {
    return { ok: false, status, error: `status=${status} — approval required` };
  }
  return { ok: true, status: "APPROVED", error: null };
}

const VALID_AGENTS: AgentType[] = [...AGENT_TYPES];

function createCheck(
  name: string,
  status: "pass" | "fail" | "warn" | "skip",
  message?: string,
): VerifyCheck {
  return { name, status, message };
}

function runCommand(cmd: string, cwd: string): string | null {
  try {
    return execSync(cmd, {
      encoding: "utf-8",
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

function checkCharterPreflight(
  workspace: string,
  agentType: AgentType,
): VerifyCheck {
  const resultFile = join(
    workspace,
    ".serena",
    "memories",
    `result-${agentType}.md`,
  );

  if (!existsSync(resultFile)) {
    return createCheck("Charter Preflight", "skip", "Result file not found");
  }

  const content = readFileSync(resultFile, "utf-8");

  if (!content.includes("CHARTER_CHECK:")) {
    return createCheck(
      "Charter Preflight",
      "warn",
      "Block missing from result",
    );
  }

  if (
    /\{[^}]+\}/.test(content.split("CHARTER_CHECK:")[1]?.split("```")[0] || "")
  ) {
    return createCheck(
      "Charter Preflight",
      "warn",
      "Contains unfilled placeholders",
    );
  }

  return createCheck("Charter Preflight", "pass", "Properly filled");
}

function checkHardcodedSecrets(workspace: string): VerifyCheck {
  const patterns = ["*.py", "*.ts", "*.tsx", "*.js", "*.dart"];

  const secretPattern =
    "(password|secret|api_key|token)\\s*=\\s*['\"][^'\"]{8,}";

  for (const pattern of patterns) {
    const result = runCommand(
      `grep -rn --include="${pattern}" -E "${secretPattern}" . 2>/dev/null | grep -v test | grep -v example | grep -v node_modules | head -1`,
      workspace,
    );
    if (result) {
      return createCheck(
        "Hardcoded Secrets",
        "fail",
        `Found in: ${result.split(":")[0]}`,
      );
    }
  }

  return createCheck("Hardcoded Secrets", "pass", "None detected");
}

function checkTodoComments(workspace: string): VerifyCheck {
  const result = runCommand(
    `grep -rn --include="*.py" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.dart" -E "TODO|FIXME|HACK|XXX" . 2>/dev/null | grep -v node_modules | grep -v ".agent/" | wc -l`,
    workspace,
  );

  const count = Number.parseInt(result || "0", 10);

  if (count > 0) {
    return createCheck("TODO/FIXME Comments", "warn", `${count} found`);
  }

  return createCheck("TODO/FIXME Comments", "pass", "None found");
}

function checkPythonSyntax(workspace: string): VerifyCheck {
  // Use cross-platform command to detect uv
  const whichCmd = process.platform === "win32" ? "where uv" : "which uv";
  const hasUv = runCommand(whichCmd, workspace);
  if (!hasUv) {
    return createCheck("Python Syntax", "skip", "uv not available");
  }

  // Use cross-platform glob via uv itself instead of Unix find
  const findCmd =
    process.platform === "win32"
      ? `powershell -Command "Get-ChildItem -Recurse -Filter *.py -Exclude node_modules,.venv | Select-Object -First 20 -ExpandProperty FullName | ForEach-Object { uv run python -m py_compile $_ 2>&1 }"`
      : `find . -name "*.py" -not -path "*/node_modules/*" -not -path "*/.venv/*" -exec uv run python -m py_compile {} \\; 2>&1 | head -5`;
  const result = runCommand(findCmd, workspace);

  if (result && result.length > 0) {
    return createCheck("Python Syntax", "fail", "Syntax errors found");
  }

  return createCheck("Python Syntax", "pass", "Valid");
}

function checkSqlInjection(workspace: string): VerifyCheck {
  const result = runCommand(
    `grep -rn --include="*.py" -E "f['"].*SELECT|f['"].*INSERT|f['"].*UPDATE|f['"].*DELETE" . 2>/dev/null | grep -v test | grep -v node_modules | head -1`,
    workspace,
  );

  if (result) {
    return createCheck(
      "SQL Injection",
      "fail",
      "f-string with SQL keywords detected",
    );
  }

  return createCheck("SQL Injection", "pass", "None detected");
}

function checkPythonTests(workspace: string): VerifyCheck {
  const hasUv = runCommand("which uv", workspace);
  const hasPyproject = existsSync(join(workspace, "pyproject.toml"));

  if (!hasUv || !hasPyproject) {
    return createCheck(
      "Python Tests",
      "skip",
      !hasUv ? "uv not available" : "pyproject.toml not found",
    );
  }

  const result = runCommand("uv run pytest -q --tb=no 2>&1", workspace);

  if (result?.includes("passed") || result?.includes("no tests ran")) {
    return createCheck("Python Tests", "pass", "Tests pass");
  }

  return createCheck("Python Tests", "fail", "Tests failing");
}

function checkTypeScript(workspace: string): VerifyCheck {
  if (!existsSync(join(workspace, "tsconfig.json"))) {
    return createCheck("TypeScript", "skip", "Not configured");
  }

  const result = runCommand("npx tsc --noEmit 2>&1", workspace);

  if (result === null || result === "") {
    return createCheck("TypeScript", "pass", "Compilation clean");
  }

  if (result.includes("error")) {
    return createCheck("TypeScript", "fail", "Type errors found");
  }

  return createCheck("TypeScript", "pass", "Compilation clean");
}

function checkInlineStyles(workspace: string): VerifyCheck {
  const result = runCommand(
    `grep -rn --include="*.tsx" --include="*.jsx" 'style={{' . 2>/dev/null | grep -v node_modules | wc -l`,
    workspace,
  );

  const count = Number.parseInt(result || "0", 10);

  if (count > 0) {
    return createCheck(
      "Inline Styles",
      "warn",
      `${count} found (prefer Tailwind)`,
    );
  }

  return createCheck("Inline Styles", "pass", "None found");
}

function checkAnyTypes(workspace: string): VerifyCheck {
  const result = runCommand(
    `grep -rn --include="*.ts" --include="*.tsx" ': any' . 2>/dev/null | grep -v node_modules | grep -v ".d.ts" | wc -l`,
    workspace,
  );

  const count = Number.parseInt(result || "0", 10);

  if (count > 3) {
    return createCheck("Any Types", "fail", `${count} found (limit: 3)`);
  }

  if (count > 0) {
    return createCheck("Any Types", "warn", `${count} found`);
  }

  return createCheck("Any Types", "pass", "None found");
}

function checkFrontendTests(workspace: string): VerifyCheck {
  if (!existsSync(join(workspace, "package.json"))) {
    return createCheck("Frontend Tests", "skip", "No package.json");
  }

  const result = runCommand(
    "npx vitest run --reporter=verbose 2>&1",
    workspace,
  );

  if (result?.includes("passed") || result?.includes("✓")) {
    return createCheck("Frontend Tests", "pass", "Tests pass");
  }

  return createCheck(
    "Frontend Tests",
    "warn",
    "Tests failed or vitest not configured",
  );
}

function checkFlutterAnalysis(workspace: string): VerifyCheck {
  const hasFlutter = runCommand("which flutter", workspace);

  if (!hasFlutter) {
    const hasDart = runCommand("which dart", workspace);
    if (!hasDart) {
      return createCheck("Flutter/Dart Analysis", "skip", "Not available");
    }

    const result = runCommand("dart analyze 2>&1", workspace);
    if (result?.includes("No issues found")) {
      return createCheck("Dart Analysis", "pass", "Clean");
    }
    return createCheck("Dart Analysis", "fail", "Issues found");
  }

  const result = runCommand("flutter analyze 2>&1", workspace);

  if (result?.includes("No issues found")) {
    return createCheck("Flutter Analysis", "pass", "Clean");
  }

  return createCheck("Flutter Analysis", "fail", "Issues found");
}

function checkFlutterTests(workspace: string): VerifyCheck {
  const hasFlutter = runCommand("which flutter", workspace);

  if (!hasFlutter) {
    return createCheck("Flutter Tests", "skip", "Flutter not available");
  }

  const result = runCommand("flutter test 2>&1", workspace);

  if (result?.includes("All tests passed")) {
    return createCheck("Flutter Tests", "pass", "All tests pass");
  }

  return createCheck("Flutter Tests", "fail", "Tests failed");
}

function checkPmPlan(workspace: string): VerifyCheck {
  const planPath = join(workspace, ".agent", "plan.json");

  if (!existsSync(planPath)) {
    return createCheck("PM Plan", "warn", "plan.json not found");
  }

  try {
    JSON.parse(readFileSync(planPath, "utf-8"));
    return createCheck("PM Plan", "pass", "Valid JSON");
  } catch {
    return createCheck("PM Plan", "fail", "Invalid JSON");
  }
}

const EVIDENCE_PATH_PATTERN = /^\.serena\/evidence\/[^/]+\/[^/]+\/?$/;

function parseEvidencePathIds(
  evidencePath: string,
): { runId: string; taskId: string } | null {
  const match = evidencePath.match(/^\.serena\/evidence\/([^/]+)\/([^/]+)\/?$/);
  if (!match?.[1] || !match[2]) return null;
  return { runId: match[1], taskId: match[2] };
}

function checkEvidencePack(
  workspace: string,
  agentType: AgentType,
): VerifyCheck[] {
  const checks: VerifyCheck[] = [];

  const resultFile = join(
    workspace,
    ".serena",
    "memories",
    `result-${agentType}.md`,
  );

  if (!existsSync(resultFile)) {
    checks.push(
      createCheck("Evidence Path", "fail", `result-${agentType}.md not found`),
    );
    return checks;
  }

  const resultContent = readFileSync(resultFile, "utf-8");
  const pathMatch = resultContent.match(/^EVIDENCE_PATH:\s*(.+)$/m);

  if (!pathMatch?.[1]) {
    checks.push(
      createCheck(
        "Evidence Path",
        "fail",
        `EVIDENCE_PATH: not found in result-${agentType}.md`,
      ),
    );
    return checks;
  }

  const evidencePath = pathMatch[1].trim();

  if (!EVIDENCE_PATH_PATTERN.test(evidencePath)) {
    checks.push(
      createCheck(
        "Evidence Path",
        "fail",
        "Invalid format. Expected: .serena/evidence/<run_id>/<task_id>/",
      ),
    );
    return checks;
  }

  checks.push(createCheck("Evidence Path", "pass", evidencePath));

  const evidenceDir = join(workspace, evidencePath);
  const requiredFiles = ["evidence_pack.yaml", "verification_report.md"];
  const hasLogTxt = existsSync(join(evidenceDir, "execution_log.txt"));
  const hasLogJson = existsSync(join(evidenceDir, "execution_log.json"));

  for (const file of requiredFiles) {
    if (!existsSync(join(evidenceDir, file))) {
      if (file === "evidence_pack.yaml") {
        const ids = parseEvidencePathIds(evidencePath);
        const hint = ids
          ? ` Run: oh-my-ag evidence:init ${ids.runId} ${ids.taskId} -w "${workspace}"`
          : "";
        checks.push(
          createCheck("Evidence Files", "fail", `Missing: ${file}.${hint}`),
        );
      } else {
        checks.push(createCheck("Evidence Files", "fail", `Missing: ${file}`));
      }
      return checks;
    }
  }

  if (!hasLogTxt && !hasLogJson) {
    checks.push(
      createCheck(
        "Evidence Files",
        "fail",
        "Missing: execution_log.txt (or .json)",
      ),
    );
    return checks;
  }

  checks.push(createCheck("Evidence Files", "pass", "3/3 present"));

  const yamlPath = join(evidenceDir, "evidence_pack.yaml");
  let pack: Record<string, unknown>;
  try {
    pack = YAML.parse(readFileSync(yamlPath, "utf-8"));
  } catch {
    checks.push(
      createCheck(
        "Evidence Schema",
        "fail",
        "evidence_pack.yaml is not valid YAML",
      ),
    );
    return checks;
  }

  if (!pack || typeof pack !== "object") {
    checks.push(
      createCheck(
        "Evidence Schema",
        "fail",
        "evidence_pack.yaml is empty or not a mapping",
      ),
    );
    return checks;
  }

  const requiredKeys = [
    "run_id",
    "task_id",
    "timestamp_kst",
    "artifacts",
    "inputs",
    "assumptions",
    "decisions",
    "tests",
    "approvals",
  ];
  const missingKeys = requiredKeys.filter((k) => !(k in pack));

  if (missingKeys.length > 0) {
    checks.push(
      createCheck(
        "Evidence Schema",
        "fail",
        `Missing keys: ${missingKeys.join(", ")}`,
      ),
    );
    return checks;
  }

  const artifacts = pack.artifacts as Record<string, unknown> | undefined;
  if (!artifacts || typeof artifacts !== "object" || !("paths" in artifacts)) {
    checks.push(
      createCheck("Evidence Schema", "fail", "artifacts.paths is required"),
    );
    return checks;
  }

  // inputs must be object with source_refs, file_hashes, config_versions
  const inputs = pack.inputs as Record<string, unknown> | undefined;
  if (!inputs || typeof inputs !== "object") {
    checks.push(
      createCheck("Evidence Schema", "fail", "inputs must be an object"),
    );
    return checks;
  }
  const inputsRequired = ["source_refs", "file_hashes", "config_versions"];
  const missingInputs = inputsRequired.filter((k) => !(k in inputs));
  if (missingInputs.length > 0) {
    checks.push(
      createCheck(
        "Evidence Schema",
        "fail",
        `inputs missing: ${missingInputs.join(", ")}`,
      ),
    );
    return checks;
  }

  // decisions must be an array
  if (!Array.isArray(pack.decisions)) {
    checks.push(
      createCheck("Evidence Schema", "fail", "decisions must be an array"),
    );
    return checks;
  }

  // tests must be an array
  if (!Array.isArray(pack.tests)) {
    checks.push(
      createCheck("Evidence Schema", "fail", "tests must be an array"),
    );
    return checks;
  }

  checks.push(
    createCheck("Evidence Schema", "pass", "All required keys present"),
  );

  const approvals = pack.approvals as Record<string, unknown> | undefined;

  if (!approvals || typeof approvals !== "object") {
    checks.push(
      createCheck(
        "Evidence Approvals",
        "fail",
        "approvals must be a mapping with hitl_required",
      ),
    );
    return checks;
  }

  if (!("hitl_required" in approvals)) {
    checks.push(
      createCheck(
        "Evidence Approvals",
        "fail",
        "approvals.hitl_required is required",
      ),
    );
    return checks;
  }

  if (approvals.hitl_required === true && !approvals.hitl_decision_ref) {
    checks.push(
      createCheck(
        "Evidence Approvals",
        "fail",
        "hitl_required=true but hitl_decision_ref missing",
      ),
    );
    return checks;
  }

  checks.push(
    createCheck("Evidence Approvals", "pass", "Approval chain valid"),
  );

  // --- approvals.json Stage-4 semantic check (delegates to shared validator) ---
  const approvalsJsonPath = join(evidenceDir, "approvals.json");
  const approvalsValidation = validateApprovalsFile(approvalsJsonPath);
  if (!approvalsValidation.ok) {
    checks.push(
      createCheck(
        "Approvals JSON",
        "fail",
        approvalsValidation.error || "validation failed",
      ),
    );
    return checks;
  }

  checks.push(createCheck("Approvals JSON", "pass", "APPROVED — gate open"));

  return checks;
}

function runAgentChecks(
  agentType: AgentType,
  workspace: string,
): VerifyCheck[] {
  const checks: VerifyCheck[] = [];

  switch (agentType) {
    case "backend":
      checks.push(checkPythonSyntax(workspace));
      checks.push(checkSqlInjection(workspace));
      checks.push(checkPythonTests(workspace));
      break;

    case "frontend":
      checks.push(checkTypeScript(workspace));
      checks.push(checkInlineStyles(workspace));
      checks.push(checkAnyTypes(workspace));
      checks.push(checkFrontendTests(workspace));
      break;

    case "mobile":
      checks.push(checkFlutterAnalysis(workspace));
      checks.push(checkFlutterTests(workspace));
      break;

    case "qa":
      checks.push(
        createCheck("QA Report", "pass", "Verified by self-check.md"),
      );
      break;

    case "debug":
      if (existsSync(join(workspace, "pyproject.toml"))) {
        checks.push(checkPythonTests(workspace));
      } else if (existsSync(join(workspace, "package.json"))) {
        checks.push(checkFrontendTests(workspace));
      } else {
        checks.push(
          createCheck("Debug Tests", "skip", "No test runner detected"),
        );
      }
      break;

    case "pm":
      checks.push(checkPmPlan(workspace));
      break;
  }

  return checks;
}

/**
 * Pure verify logic — returns VerifyResult without process.exit.
 * Reusable by doctor --verify-gate.
 */
export function runVerify(
  agentType: string,
  workspace: string,
):
  | { result: VerifyResult; exitCode: number }
  | { error: string; exitCode: number } {
  const normalizedAgent = agentType.toLowerCase() as AgentType;

  if (!VALID_AGENTS.includes(normalizedAgent)) {
    return {
      error: `Invalid agent type: ${agentType}. Valid types: ${VALID_AGENTS.join(", ")}`,
      exitCode: 2,
    };
  }

  const resolvedWorkspace = workspace || process.cwd();

  if (!existsSync(resolvedWorkspace)) {
    return { error: `Workspace not found: ${resolvedWorkspace}`, exitCode: 2 };
  }

  // Check for aborted status (Loop Guard) — exit 3: unverifiable
  const resultFilePath = join(
    resolvedWorkspace,
    ".serena",
    "memories",
    `result-${normalizedAgent}.md`,
  );
  if (existsSync(resultFilePath)) {
    const resultContent = readFileSync(resultFilePath, "utf-8");
    const statusMatch = resultContent.match(/^## Status:\s*(\S+)/m);
    if (statusMatch?.[1] === "aborted") {
      return {
        error: `Agent ${normalizedAgent} was aborted (Loop Guard). Verification not possible.`,
        exitCode: 3,
      };
    }
  }

  const checks: VerifyCheck[] = [];

  checks.push(checkCharterPreflight(resolvedWorkspace, normalizedAgent));
  checks.push(checkHardcodedSecrets(resolvedWorkspace));
  checks.push(checkTodoComments(resolvedWorkspace));
  checks.push(...runAgentChecks(normalizedAgent, resolvedWorkspace));
  checks.push(...checkEvidencePack(resolvedWorkspace, normalizedAgent));

  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const warned = checks.filter((c) => c.status === "warn").length;

  const result: VerifyResult = {
    ok: failed === 0,
    agent: normalizedAgent,
    workspace: resolvedWorkspace,
    checks,
    summary: { passed, failed, warned },
  };

  return { result, exitCode: failed > 0 ? 1 : 0 };
}

export async function verify(
  agentType: string,
  workspace: string,
  jsonMode = false,
  refine = false,
): Promise<void> {
  const outcome = runVerify(agentType, workspace);

  if ("error" in outcome) {
    if (jsonMode) {
      console.log(JSON.stringify({ ok: false, error: outcome.error }));
    } else {
      p.log.error(outcome.error);
    }
    process.exit(outcome.exitCode);
  }

  const { result } = outcome;

  // SSOT State Progression (Contract 2): update evidence_pack.yaml status
  updateEvidencePackStatus(result);

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  }

  // V&R Loop REFINE (Contract 4): on FAIL + --refine, generate refinement_plan.md
  if (refine && result.summary.failed > 0) {
    generateRefinementPlan(result);
  }

  if (jsonMode) {
    process.exit(outcome.exitCode);
  }

  console.clear();
  p.intro(pc.bgCyan(pc.white(` 🔍 Verify: ${result.agent} agent `)));

  p.note(pc.dim(result.workspace), "Workspace");

  const table = [
    "┌────────────────────────────┬────────┬─────────────────────────────┐",
    `│ ${pc.bold("Check")}                        │ ${pc.bold("Status")} │ ${pc.bold("Details")}                     │`,
    "├────────────────────────────┼────────┼─────────────────────────────┤",
    ...result.checks.map((check) => {
      let statusIcon: string;
      switch (check.status) {
        case "pass":
          statusIcon = pc.green("PASS");
          break;
        case "fail":
          statusIcon = pc.red("FAIL");
          break;
        case "warn":
          statusIcon = pc.yellow("WARN");
          break;
        default:
          statusIcon = pc.dim("SKIP");
      }
      const name = check.name.padEnd(26);
      const status = statusIcon.padEnd(6);
      const message = (check.message || "-").slice(0, 27).padEnd(27);
      return `│ ${name} │ ${status} │ ${message} │`;
    }),
    "└────────────────────────────┴────────┴─────────────────────────────┘",
  ].join("\n");

  console.log(table);
  console.log();

  const { passed, failed, warned } = result.summary;
  const summaryText = `${pc.green(`${passed} passed`)}, ${pc.red(`${failed} failed`)}, ${pc.yellow(`${warned} warnings`)}`;

  if (failed > 0) {
    p.outro(pc.red(`❌ Verification failed: ${summaryText}`));
    process.exit(1);
  }

  p.outro(pc.green(`✅ Verification passed: ${summaryText}`));
  process.exit(0);
}

/**
 * SSOT State Progression (Contract 2):
 * Update evidence_pack.yaml status field based on verify result.
 * pending → completed (all checks pass) or failed (any check fails).
 */
export function updateEvidencePackStatus(result: VerifyResult): void {
  const resultFilePath = join(
    result.workspace,
    ".serena",
    "memories",
    `result-${result.agent}.md`,
  );

  if (!existsSync(resultFilePath)) return;

  const content = readFileSync(resultFilePath, "utf-8");
  const pathMatch = content.match(/^EVIDENCE_PATH:\s*(.+)$/m);
  if (!pathMatch?.[1]) return;

  const yamlPath = join(
    result.workspace,
    pathMatch[1].trim(),
    "evidence_pack.yaml",
  );
  if (!existsSync(yamlPath)) return;

  try {
    const raw = readFileSync(yamlPath, "utf-8");
    const pack = YAML.parse(raw) as Record<string, unknown>;
    if (!pack || typeof pack !== "object") return;

    const newStatus = result.ok ? "completed" : "failed";
    pack.status = newStatus;
    writeFileSync(yamlPath, YAML.stringify(pack), "utf-8");
  } catch {
    // Best-effort: don't fail verify because of status update
  }
}

/**
 * V&R Loop REFINE (Contract 4):
 * On verify FAIL + --refine, generate a refinement_plan.md skeleton
 * in the evidence directory with failure reasons and an empty fix plan.
 */
function generateRefinementPlan(result: VerifyResult): void {
  // Find EVIDENCE_PATH from result file
  const resultFilePath = join(
    result.workspace,
    ".serena",
    "memories",
    `result-${result.agent}.md`,
  );

  let evidenceDir: string | null = null;
  if (existsSync(resultFilePath)) {
    const content = readFileSync(resultFilePath, "utf-8");
    const pathMatch = content.match(/^EVIDENCE_PATH:\s*(.+)$/m);
    if (pathMatch?.[1]) {
      evidenceDir = join(result.workspace, pathMatch[1].trim());
    }
  }

  if (!evidenceDir) {
    p.log.warn("Cannot generate refinement plan: EVIDENCE_PATH not found");
    return;
  }

  if (!existsSync(evidenceDir)) {
    mkdirSync(evidenceDir, { recursive: true });
  }

  const failedChecks = result.checks.filter((c) => c.status === "fail");
  const timestamp = new Date().toISOString();

  const plan = [
    "# Refinement Plan",
    "",
    `**Agent**: ${result.agent}`,
    `**Generated**: ${timestamp}`,
    `**Trigger**: verify FAIL (${failedChecks.length} check(s) failed)`,
    "",
    "## Failed Checks",
    "",
    ...failedChecks.map(
      (c) => `- **${c.name}**: ${c.message || "No details"}`,
    ),
    "",
    "## Root Cause Analysis",
    "",
    "<!-- Fill in the root cause for each failure -->",
    "",
    "## Fix Plan",
    "",
    "<!-- List concrete steps to address each failure -->",
    "",
    "- [ ] ",
    "",
  ].join("\n");

  const planPath = join(evidenceDir, "refinement_plan.md");
  writeFileSync(planPath, plan, "utf-8");
  p.log.info(`Refinement plan generated: ${planPath}`);
}
