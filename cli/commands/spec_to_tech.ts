import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";
import pc from "picocolors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type SpecToTechOptions = {
  runId: string;
  taskId: string;
  workspace?: string;
  dryRun?: boolean;
};

const REQUIRED_SECTIONS = [
  "## 1. Goal Summary",
  "## 2. Scope",
  "## 3. Architecture",
  "## 4. Risks & Approvals",
  "## 5. Verification Plan",
  "## 6. Rollout Plan",
];

function formatKstIso(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().replace("Z", "+09:00");
}

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

function loadTemplate(): { content: string; path: string } {
  const templatePath = join(__dirname, "..", "..", "docs", "TECH_TEMPLATE.md");
  if (!existsSync(templatePath)) {
    p.log.error(`TECH_TEMPLATE.md not found at ${templatePath}`);
    process.exit(2);
  }
  return { content: readFileSync(templatePath, "utf-8"), path: templatePath };
}

function extractSection(specContent: string, heading: string): string {
  const regex = new RegExp(
    `^#{1,3}\\s*${heading}[^\\n]*\\n([\\s\\S]*?)(?=^#{1,3}\\s|$)`,
    "mi",
  );
  const match = specContent.match(regex);
  return match?.[1]?.trim() || "(Not found in SPEC — fill manually)";
}

function buildTechMd(specContent: string, template: string): string {
  let tech = template;

  const goalSummary = extractSection(
    specContent,
    "(?:Goal|Summary|Overview|목표)",
  );
  const scopeIn = extractSection(specContent, "(?:In.Scope|Scope|범위)");
  const scopeOut = extractSection(specContent, "(?:Out.of.Scope|제외)");
  const architecture = extractSection(
    specContent,
    "(?:Architecture|아키텍처|설계)",
  );
  const risks = extractSection(specContent, "(?:Risk|위험|Approval)");
  const verification = extractSection(
    specContent,
    "(?:Verification|검증|Test)",
  );
  const rollout = extractSection(specContent, "(?:Rollout|배포|Deploy)");

  tech = tech.replace("${GOAL_SUMMARY}", goalSummary);
  tech = tech.replace("${SCOPE_IN}", scopeIn);
  tech = tech.replace("${SCOPE_OUT}", scopeOut);
  tech = tech.replace("${ARCHITECTURE}", architecture);
  tech = tech.replace("${RISK_ROW}", risks.split("\n")[0] || "(TBD)");
  tech = tech.replace("${HITL_REQUIRED}", "true");
  tech = tech.replace("${VERIFICATION_PLAN}", verification);
  tech = tech.replace("${ROLLOUT_PLAN}", rollout);

  return tech;
}

function validateTechMd(content: string): string[] {
  const errors: string[] = [];

  // Check for unreplaced tokens
  const unreplaced = content.match(/\$\{[A-Z_]+\}/g);
  if (unreplaced) {
    errors.push(`Unreplaced tokens: ${unreplaced.join(", ")}`);
  }

  // Check for all 6 required sections
  for (const section of REQUIRED_SECTIONS) {
    if (!content.includes(section)) {
      errors.push(`Missing section: ${section}`);
    }
  }

  return errors;
}

export async function specToTech(
  specPath: string,
  options: SpecToTechOptions,
): Promise<void> {
  const { runId, taskId, dryRun } = options;
  const workspace = options.workspace || process.cwd();

  // --- Validate inputs ---
  if (!specPath || !runId || !taskId) {
    p.log.error("spec-path, --run-id, and --task-id are all required");
    process.exit(2);
  }

  const resolvedSpec = join(workspace, specPath);
  if (!existsSync(resolvedSpec)) {
    p.log.error(`SPEC file not found: ${resolvedSpec}`);
    process.exit(2);
  }

  // --- Load template (SSOT) ---
  const template = loadTemplate();

  const specContent = readFileSync(resolvedSpec, "utf-8");

  // --- Generate TECH.md ---
  const techContent = buildTechMd(specContent, template.content);

  // --- Quality gate ---
  const validationErrors = validateTechMd(techContent);
  if (validationErrors.length > 0) {
    for (const err of validationErrors) {
      p.log.error(err);
    }
    process.exit(1);
  }

  // --- Compute file hashes ---
  const specHash = sha256(specContent);
  const templateHash = sha256(template.content);

  const techPath = join(workspace, "docs", "TECH.md");
  const evidenceDir = join(workspace, ".serena", "evidence", runId, taskId);
  const memDir = join(workspace, ".serena", "memories");
  const resultPmPath = join(memDir, "result-pm.md");

  // --- Dry-run: report only ---
  if (dryRun) {
    p.log.info(`TECH.md would be created at: ${pc.cyan(techPath)}`);
    p.log.info(`Evidence pack at: ${pc.cyan(evidenceDir)}`);
    p.log.info(`Result memory at: ${pc.cyan(resultPmPath)}`);
    p.log.info(`SPEC hash: ${specHash.slice(0, 12)}...`);
    p.log.info(`Template hash: ${templateHash.slice(0, 12)}...`);
    p.log.info("Validation: PASS (0 errors)");
    return;
  }

  // --- Write TECH.md ---
  mkdirSync(join(workspace, "docs"), { recursive: true });
  writeFileSync(techPath, techContent, "utf-8");

  // --- Create evidence pack ---
  const timestampKst = formatKstIso(new Date());
  mkdirSync(evidenceDir, { recursive: true });

  const evidenceFiles: { name: string; content: string }[] = [
    {
      name: "evidence_pack.yaml",
      content: [
        `run_id: "${runId}"`,
        `task_id: "${taskId}"`,
        `timestamp_kst: "${timestampKst}"`,
        "",
        "artifacts:",
        "  paths:",
        "    - docs/TECH.md",
        "inputs:",
        "  source_refs:",
        `    - "${specPath}"`,
        "  file_hashes:",
        `    - file: "${specPath}"`,
        `      sha256: "${specHash}"`,
        `    - file: "docs/TECH_TEMPLATE.md"`,
        `      sha256: "${templateHash}"`,
        "  config_versions: []",
        "assumptions: []",
        "decisions:",
        "  - Generated TECH.md from SPEC via spec:to-tech",
        "  - spec_to_tech_v1",
        "tests: []",
        "approvals:",
        "  hitl_required: false",
        "",
      ].join("\n"),
    },
    {
      name: "verification_report.md",
      content: [
        "# Verification Report",
        `- Source: ${specPath}`,
        "- Output: docs/TECH.md",
        "- Status: PENDING",
        `- Generated: ${timestampKst}`,
        "",
      ].join("\n"),
    },
    {
      name: "execution_log.txt",
      content: [
        `[${timestampKst}] spec:to-tech started`,
        `[${timestampKst}] Read SPEC from ${specPath}`,
        `[${timestampKst}] Loaded template from docs/TECH_TEMPLATE.md`,
        `[${timestampKst}] Generated docs/TECH.md`,
        `[${timestampKst}] Quality gate: PASS (0 errors)`,
        `[${timestampKst}] Created evidence pack at .serena/evidence/${runId}/${taskId}/`,
        "",
      ].join("\n"),
    },
    {
      name: "approvals.json",
      content: `${JSON.stringify(
        {
          schema_version: "1",
          run_id: runId,
          task_id: taskId,
          status: "PENDING",
          requested_by: "agent",
          requested_at: timestampKst,
          decision: { by: null, at: null, reason: null },
          scope: {
            risk_level: "LOW",
            actions: ["spec-to-tech"],
            targets: [`.serena/evidence/${runId}/${taskId}/`],
          },
        },
        null,
        2,
      )}\n`,
    },
  ];

  for (const file of evidenceFiles) {
    writeFileSync(join(evidenceDir, file.name), file.content, "utf-8");
  }

  // --- Write result-pm.md ---
  mkdirSync(memDir, { recursive: true });
  writeFileSync(
    resultPmPath,
    `EVIDENCE_PATH: .serena/evidence/${runId}/${taskId}/\n`,
    "utf-8",
  );

  // --- Output ---
  p.log.success(`TECH.md created: ${pc.cyan(techPath)}`);
  p.log.success(`Evidence pack: ${pc.cyan(evidenceDir)}`);
  p.log.success(`Result memory: ${pc.cyan(resultPmPath)}`);
}
