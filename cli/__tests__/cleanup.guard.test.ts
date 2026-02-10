import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TEST_DIR = join(tmpdir(), "hitl-cleanup-test");
const EVID_DIR = join(TEST_DIR, ".serena", "evidence", "cg-run", "T-CG");
const CLI_PATH = join(__dirname, "..", "cli.ts");

function runCleanup(args: string): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(`npx tsx "${CLI_PATH}" cleanup ${args}`, {
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
    run_id: "cg-run",
    task_id: "T-CG",
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
      actions: ["cleanup"],
      targets: [".serena/evidence/cg-run/T-CG/"],
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
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("cleanup guard", () => {
  it("1. non-dry-run + no --evidence-path -> exit 1", () => {
    const { stdout, exitCode } = runCleanup("--json");
    expect(exitCode).toBe(1);
    const parsed = JSON.parse(stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toContain("--evidence-path is required");
  });

  it("2. non-dry-run + PENDING approvals -> exit 1", () => {
    writeApprovals({
      status: "PENDING",
      decision: { by: null, at: null, reason: null },
    });
    const { stdout, exitCode } = runCleanup(
      `--json --evidence-path "${EVID_DIR}"`,
    );
    expect(exitCode).toBe(1);
    const parsed = JSON.parse(stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toContain("PENDING");
  });

  it("3. non-dry-run + APPROVED(valid) -> no BLOCK", () => {
    writeApprovals();
    const { stdout, exitCode } = runCleanup(
      `--json --evidence-path "${EVID_DIR}"`,
    );
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.cleaned).toBeDefined();
  });
});
