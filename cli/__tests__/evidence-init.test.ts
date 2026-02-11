import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const CLI_PATH = join(__dirname, "..", "cli.ts");
let TEST_DIR = "";

function runEvidenceInit(args: string): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(`npx tsx "${CLI_PATH}" evidence:init ${args}`, {
      encoding: "utf-8",
      cwd: join(__dirname, ".."),
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30_000,
    });
    return { stdout, exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; status?: number };
    return { stdout: e.stdout || "", exitCode: e.status || 1 };
  }
}

beforeAll(() => {
  TEST_DIR = mkdtempSync(join(tmpdir(), "hitl-evidence-init-"));
});

afterAll(() => {
  if (TEST_DIR) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe("evidence:init", () => {
  it("accepts --workspace and creates skeleton files in target workspace", () => {
    const runId = "ei-run";
    const taskId = "T-EI";
    const { exitCode } = runEvidenceInit(
      `${runId} ${taskId} -w "${TEST_DIR}" --force`,
    );
    expect(exitCode).toBe(0);

    const evidenceDir = join(TEST_DIR, ".serena", "evidence", runId, taskId);
    expect(existsSync(join(evidenceDir, "evidence_pack.yaml"))).toBe(true);
    expect(existsSync(join(evidenceDir, "verification_report.md"))).toBe(true);
    expect(existsSync(join(evidenceDir, "execution_log.txt"))).toBe(true);
    expect(existsSync(join(evidenceDir, "approvals.json"))).toBe(true);
  });

  it("fails when evidence directory exists and --force is omitted", () => {
    const { exitCode } = runEvidenceInit(`ei-run T-EI -w "${TEST_DIR}"`);
    expect(exitCode).toBe(1);
  });

  it("overwrites when --force is provided", () => {
    const { exitCode } = runEvidenceInit(`ei-run T-EI -w "${TEST_DIR}" --force`);
    expect(exitCode).toBe(0);
  });
});
