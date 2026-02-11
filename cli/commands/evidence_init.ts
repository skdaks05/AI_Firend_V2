import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";

type InitOptions = {
  dryRun?: boolean;
  force?: boolean;
};

function formatKstIso(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().replace("Z", "+09:00");
}

export async function initEvidence(
  runId: string,
  taskId: string,
  options: InitOptions = {},
): Promise<void> {
  const safeRunId = (runId || "").trim();
  const safeTaskId = (taskId || "").trim();

  if (!safeRunId || !safeTaskId) {
    p.log.error("run-id and task-id are required");
    process.exit(2);
  }

  const cwd = process.cwd();
  const evidenceDir = join(cwd, ".serena", "evidence", safeRunId, safeTaskId);

  if (existsSync(evidenceDir) && !options.force) {
    p.log.error(
      `Evidence directory already exists: ${evidenceDir}\n` +
        "Use --force to overwrite.",
    );
    process.exit(1);
  }

  const timestampKst = formatKstIso(new Date());
  const files: { name: string; content: string }[] = [
    {
      name: "evidence_pack.yaml",
      content: [
        `run_id: "${safeRunId}"`,
        `task_id: "${safeTaskId}"`,
        `timestamp_kst: "${timestampKst}"`,
        `status: "pending"`,
        "",
        "artifacts:",
        "  paths: []",
        "inputs:",
        "  source_refs: []",
        "  file_hashes: []",
        "  config_versions: []",
        "assumptions: []",
        "decisions: []",
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
        "- Status: PENDING",
        "- Notes: evidence_init created this skeleton.",
        "",
      ].join("\n"),
    },
    {
      name: "execution_log.txt",
      content: [
        `[${timestampKst}] evidence_init created skeleton files`,
        "",
      ].join("\n"),
    },
    {
      name: "approvals.json",
      content: `${JSON.stringify(
        {
          schema_version: "1",
          run_id: safeRunId,
          task_id: safeTaskId,
          status: "PENDING",
          requested_by: "agent",
          requested_at: timestampKst,
          decision: { by: null, at: null, reason: null },
          scope: {
            risk_level: "LOW",
            actions: ["verify"],
            targets: [`.serena/evidence/${safeRunId}/${safeTaskId}/`],
          },
        },
        null,
        2,
      )}\n`,
    },
  ];

  if (options.dryRun) {
    console.clear();
    p.intro(pc.bgCyan(pc.white("[oh-my-ag] evidence:init (dry-run)")));
    p.note(
      [
        `Target: ${pc.cyan(evidenceDir)}`,
        "",
        pc.bold("Would create:"),
        files.map((f) => `  + ${f.name}`).join("\n"),
      ].join("\n"),
      "Evidence Init",
    );
    p.outro(pc.green("Dry-run complete."));
    return;
  }

  mkdirSync(evidenceDir, { recursive: true });

  for (const file of files) {
    writeFileSync(join(evidenceDir, file.name), file.content, "utf-8");
  }

  console.clear();
  p.intro(pc.bgCyan(pc.white("[oh-my-ag] evidence:init")));
  p.note(
    [
      `Target: ${pc.cyan(evidenceDir)}`,
      "",
      pc.bold("Created:"),
      files.map((f) => `  + ${f.name}`).join("\n"),
    ].join("\n"),
    "Evidence Init",
  );
  p.outro(pc.green("Evidence pack skeleton ready!"));
}
