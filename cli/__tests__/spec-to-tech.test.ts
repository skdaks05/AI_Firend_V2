import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TEST_DIR = join(tmpdir(), "hitl-spec-to-tech-test");
const CLI_PATH = join(__dirname, "..", "cli.ts");

function runSpecToTech(args: string): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(`npx tsx "${CLI_PATH}" spec:to-tech ${args}`, {
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
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(TEST_DIR, { recursive: true });

  // Create a minimal SPEC.md for testing
  writeFileSync(
    join(TEST_DIR, "SPEC.md"),
    [
      "# Goal",
      "Build a spec-to-tech converter.",
      "",
      "## In-Scope",
      "- TECH.md generation",
      "- Evidence pack creation",
      "",
      "## Out-of-Scope",
      "- AI summarization",
      "",
      "## Architecture",
      "CLI command reads SPEC, outputs TECH.md + evidence.",
      "",
      "## Risks",
      "Low risk — generates files only.",
      "",
      "## Verification",
      "Unit tests + HITL gate.",
      "",
      "## Rollout",
      "Ship with next CLI release.",
      "",
    ].join("\n"),
    "utf-8",
  );
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("spec:to-tech", () => {
  it("1. SPEC -> TECH.md generated with all 6 sections", () => {
    const { exitCode } = runSpecToTech(
      `SPEC.md --run-id stt-run --task-id T-STT -w "${TEST_DIR}"`,
    );
    expect(exitCode).toBe(0);

    const techPath = join(TEST_DIR, "docs", "TECH.md");
    expect(existsSync(techPath)).toBe(true);

    const content = readFileSync(techPath, "utf-8");
    expect(content).toContain("## 1. Goal Summary");
    expect(content).toContain("## 2. Scope");
    expect(content).toContain("## 3. Architecture");
    expect(content).toContain("## 4. Risks & Approvals");
    expect(content).toContain("## 5. Verification Plan");
    expect(content).toContain("## 6. Rollout Plan");
  });

  it("2. Evidence pack files created at correct path", () => {
    const evidenceDir = join(TEST_DIR, ".serena", "evidence", "stt-run", "T-STT");
    expect(existsSync(evidenceDir)).toBe(true);
    expect(existsSync(join(evidenceDir, "evidence_pack.yaml"))).toBe(true);
    expect(existsSync(join(evidenceDir, "verification_report.md"))).toBe(true);
    expect(existsSync(join(evidenceDir, "execution_log.txt"))).toBe(true);
    expect(existsSync(join(evidenceDir, "approvals.json"))).toBe(true);

    // approvals.json should have valid schema
    const approvals = JSON.parse(
      readFileSync(join(evidenceDir, "approvals.json"), "utf-8"),
    );
    expect(approvals.schema_version).toBe("1");
    expect(approvals.run_id).toBe("stt-run");
    expect(approvals.task_id).toBe("T-STT");
    expect(approvals.status).toBe("PENDING");
    expect(approvals.scope.risk_level).toBe("LOW");
    expect(approvals.scope.actions).toContain("spec-to-tech");
  });

  it("3. result-pm.md has EVIDENCE_PATH", () => {
    const resultPmPath = join(TEST_DIR, ".serena", "memories", "result-pm.md");
    expect(existsSync(resultPmPath)).toBe(true);

    const content = readFileSync(resultPmPath, "utf-8");
    expect(content).toContain("EVIDENCE_PATH: .serena/evidence/stt-run/T-STT/");
  });

  it("4. doctor --verify-gate --agent pm passes with APPROVED approvals", () => {
    // First, update approvals.json to APPROVED
    const approvalsPath = join(
      TEST_DIR,
      ".serena",
      "evidence",
      "stt-run",
      "T-STT",
      "approvals.json",
    );
    const approvals = JSON.parse(readFileSync(approvalsPath, "utf-8"));
    approvals.status = "APPROVED";
    approvals.decision = {
      by: "reviewer",
      at: new Date().toISOString(),
      reason: "test approval",
    };
    writeFileSync(approvalsPath, JSON.stringify(approvals, null, 2), "utf-8");

    // Run doctor verify-gate
    try {
      const stdout = execSync(
        `npx tsx "${CLI_PATH}" doctor --verify-gate --agent pm --workspace "${TEST_DIR}" --json`,
        {
          encoding: "utf-8",
          cwd: join(__dirname, ".."),
          stdio: ["pipe", "pipe", "pipe"],
          timeout: 30_000,
        },
      );
      const parsed = JSON.parse(stdout);
      expect(parsed.ok).toBe(true);
      expect(parsed.mode).toBe("verify-gate");
    } catch (err: unknown) {
      const e = err as { stdout?: string; status?: number };
      // Should not fail, but if it does, the test will report the issue
      expect(e.status).toBe(0);
    }
  });
});
