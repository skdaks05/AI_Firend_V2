#!/usr/bin/env node
import { Command } from "commander";
import { checkStatus, spawnAgent } from "./commands/agent.js";
import { bridge } from "./commands/bridge.js";
import { cleanup } from "./commands/cleanup.js";
import { doctor } from "./commands/doctor.js";
import { initEvidence } from "./commands/evidence_init.js";
import { install } from "./commands/install.js";
import { specToTech } from "./commands/spec_to_tech.js";
import { initMemory } from "./commands/memory.js";
import { retro } from "./commands/retro.js";
import { stats } from "./commands/stats.js";
import { update } from "./commands/update.js";
import { usage } from "./commands/usage.js";
import { verify } from "./commands/verify.js";
import { startDashboard } from "./dashboard.js";
import { startTerminalDashboard } from "./terminal-dashboard.js";

const VERSION = "1.1.1";

const program = new Command();

program
  .name("oh-my-ag")
  .description("Multi-Agent Skills for Antigravity IDE")
  .version(VERSION)
  .action(() => {
    install().catch(console.error);
  });

program
  .command("dashboard")
  .description("Start terminal dashboard (real-time agent monitoring)")
  .action(async () => {
    await startTerminalDashboard();
  });

program
  .command("dashboard:web")
  .description("Start web dashboard on http://localhost:9847")
  .action(() => {
    startDashboard();
  });

program
  .command("usage")
  .description("Show model usage quotas (connects to local Antigravity IDE)")
  .option("--json", "Output as JSON")
  .option("--raw", "Dump raw RPC response")
  .action((options) => {
    usage(options.json, options.raw).catch(console.error);
  });

program
  .command("update")
  .description("Update skills to latest version from registry")
  .action(() => {
    update().catch(console.error);
  });

program
  .command("doctor")
  .description("Check CLI installations, MCP configs, and skill status")
  .option("--json", "Output as JSON for CI/CD")
  .option("--verify-gate", "Run verify gate only (skip standard checks)")
  .option("--agent <type>", "Agent type for verify-gate (backend/frontend/mobile/qa/debug/pm)")
  .option("-w, --workspace <path>", "Workspace path for verify-gate", process.cwd())
  .action((options) => {
    doctor(options.json, {
      json: options.json,
      verifyGate: options.verifyGate,
      agent: options.agent,
      workspace: options.workspace,
    }).catch(console.error);
  });

program
  .command("stats")
  .description("View productivity metrics")
  .option("--json", "Output as JSON")
  .option("--reset", "Reset metrics data")
  .action((options) => {
    stats(options.json, options.reset).catch(console.error);
  });

program
  .command("retro")
  .description("Session retrospective (learnings & next steps)")
  .option("--json", "Output as JSON")
  .option("--interactive", "Interactive mode (manual entry)")
  .action((options) => {
    retro(options.json, options.interactive).catch(console.error);
  });

program
  .command("cleanup")
  .description("Clean up orphaned subagent processes and temp files")
  .option("--dry-run", "Show what would be cleaned without making changes")
  .option("--json", "Output as JSON")
  .option(
    "--evidence-path <path>",
    "Evidence directory for approvals guard (required for apply)",
  )
  .action((options) => {
    cleanup(options.dryRun, options.json, options.evidencePath).catch(
      console.error,
    );
  });

program
  .command("bridge [url]")
  .description("Bridge MCP stdio to Streamable HTTP (for Serena)")
  .action((url) => {
    bridge(url).catch(console.error);
  });

program
  .command("agent:spawn <agent-id> <prompt> <session-id>")
  .description("Spawn a subagent (prompt can be inline text or a file path)")
  .option(
    "-v, --vendor <vendor>",
    "CLI vendor override (gemini/claude/codex/qwen)",
  )
  .option(
    "-w, --workspace <path>",
    "Working directory for the agent (auto-detected if omitted)",
  )
  .action((agentId, prompt, sessionId, options) => {
    spawnAgent(
      agentId,
      prompt,
      sessionId,
      options.workspace || ".",
      options.vendor,
    ).catch(console.error);
  });

program
  .command("agent:status <session-id> [agent-ids...]")
  .description("Check status of subagents")
  .option("-r, --root <path>", "Root path for memory checks", process.cwd())
  .action((sessionId, agentIds, options) => {
    checkStatus(sessionId, agentIds, options.root).catch(console.error);
  });

program
  .command("memory:init")
  .description("Initialize Serena memory schema in .serena/memories")
  .option("--json", "Output as JSON")
  .option("--force", "Overwrite empty or existing schema files")
  .action((options) => {
    initMemory(options.json, options.force).catch(console.error);
  });

program
  .command("evidence:init <run-id> <task-id>")
  .description("Initialize Evidence Pack skeleton in .serena/evidence")
  .option("--dry-run", "Show what would be created without writing files")
  .option("--force", "Overwrite existing evidence directory")
  .action((runId, taskId, options) => {
    initEvidence(runId, taskId, {
      dryRun: options.dryRun,
      force: options.force,
    }).catch(console.error);
  });

program
  .command("verify <agent-type>")
  .description("Verify subagent output (backend/frontend/mobile/qa/debug/pm)")
  .option("-w, --workspace <path>", "Workspace path", process.cwd())
  .option("--json", "Output as JSON")
  .action((agentType, options) => {
    verify(agentType, options.workspace, options.json).catch(console.error);
  });

program
  .command("spec:to-tech <spec-path>")
  .description("Generate TECH.md from SPEC.md with evidence pack")
  .requiredOption("--run-id <id>", "Run ID for evidence tracking")
  .requiredOption("--task-id <id>", "Task ID for evidence tracking")
  .option("-w, --workspace <path>", "Workspace path", process.cwd())
  .action((specPath, options) => {
    specToTech(specPath, {
      runId: options.runId,
      taskId: options.taskId,
      workspace: options.workspace,
    }).catch(console.error);
  });

program.parse();
