import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TEST_DIR = join(tmpdir(), "hitl-doctor-gate-test");
const EVID_DIR = join(TEST_DIR, ".serena", "evidence", "dg-run", "T-DG");
const MEM_DIR = join(TEST_DIR, ".serena", "memories");
const CLI_PATH = join(__dirname, "..", "cli.ts");

function runDoctor(args: string): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(`npx tsx "${CLI_PATH}" doctor ${args}`, {
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

function writeApprovals(overrides: Record<string, unknown> = {}): void {
  const base = {
    schema_version: "1",
    run_id: "dg-run",
    task_id: "T-DG",
    status: "APPROVED",
    requested_by: "agent",
    requested_at: "2026-02-10T15:00:00+09:00",
    decision: {
      by: "reviewer",
      at: "2026-02-10T15:05:00+09:00",
      reason: "ok",
    },
    scope: {
      risk_level: "LOW",
      actions: ["verify"],
      targets: [".serena/evidence/dg-run/T-DG/"],
    },
    ...overrides,
  };
  writeFileSync(
    join(EVID_DIR, "approvals.json"),
    JSON.stringify(base, null, 2),
    "utf-8",
  );
}

beforeAll(() => {
  mkdirSync(EVID_DIR, { recursive: true });
  mkdirSync(MEM_DIR, { recursive: true });

  writeFileSync(
    join(MEM_DIR, "result-backend.md"),
    "EVIDENCE_PATH: .serena/evidence/dg-run/T-DG/\n",
    "utf-8",
  );

  writeFileSync(
    join(EVID_DIR, "evidence_pack.yaml"),
    [
      'run_id: "dg-run"',
      'task_id: "T-DG"',
      'timestamp_kst: "2026-02-10T15:00:00+09:00"',
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
    "utf-8",
  );

  writeFileSync(
    join(EVID_DIR, "verification_report.md"),
    "# Verification Report\n- Status: PENDING\n",
    "utf-8",
  );

  writeFileSync(
    join(EVID_DIR, "execution_log.txt"),
    "[2026-02-10T15:00:00+09:00] test\n",
    "utf-8",
  );
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("doctor --verify-gate", () => {
  it("1. PENDING approvals -> exit 1, ok=false", () => {
    writeApprovals({
      status: "PENDING",
      decision: { by: null, at: null, reason: null },
    });

    const { stdout, exitCode } = runDoctor(
      `--verify-gate --agent backend --workspace "${TEST_DIR}" --json`,
    );
    expect(exitCode).toBe(1);
    const parsed = JSON.parse(stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.mode).toBe("verify-gate");
    const approvalsCheck = parsed.verify.checks.find(
      (c: { name: string }) => c.name === "Approvals JSON",
    );
    expect(approvalsCheck?.status).toBe("fail");
  });

  it("2. APPROVED(valid) -> exit 0, ok=true", () => {
    writeApprovals();

    const { stdout, exitCode } = runDoctor(
      `--verify-gate --agent backend --workspace "${TEST_DIR}" --json`,
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.mode).toBe("verify-gate");
    expect(parsed.verify.ok).toBe(true);
  });

  it(
    "3. default doctor mode (no --verify-gate) -> standard schema",
    { timeout: 30_000 },
    () => {
      const { stdout, exitCode } = runDoctor("--json");
      // exit 0 or 1 depending on environment, but output should have standard fields
      const parsed = JSON.parse(stdout);
      expect(parsed.clis).toBeDefined();
      expect(parsed.skills).toBeDefined();
      expect(parsed.serena).toBeDefined();
      expect(parsed.mode).toBeUndefined();
    },
  );

  it("4. --verify-gate without --agent -> exit 2", () => {
    const { stdout, exitCode } = runDoctor("--verify-gate --json");
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toContain("--agent");
  });
});
