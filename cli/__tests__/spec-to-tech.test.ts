import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TEST_DIR = join(tmpdir(), "hitl-spec-to-tech-test");
const CLI_PATH = join(__dirname, "..", "cli.ts");
const TEMPLATE_PATH = join(__dirname, "..", "..", "docs", "TECH_TEMPLATE.md");
const TEMPLATE_BACKUP = `${TEMPLATE_PATH}.bak`;

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
  // Restore template if backup exists (from template-missing test)
  if (existsSync(TEMPLATE_BACKUP)) {
    renameSync(TEMPLATE_BACKUP, TEMPLATE_PATH);
  }
});

describe("spec:to-tech", () => {
  it("1. SPEC + template -> TECH.md with 6 sections + exit 0", () => {
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

    // No unreplaced tokens
    expect(content).not.toMatch(/\$\{[A-Z_]+\}/);
  });

  it("2. Evidence pack has file_hashes + decisions version", () => {
    const evidenceDir = join(TEST_DIR, ".serena", "evidence", "stt-run", "T-STT");
    expect(existsSync(evidenceDir)).toBe(true);

    const packYaml = readFileSync(
      join(evidenceDir, "evidence_pack.yaml"),
      "utf-8",
    );
    // file_hashes should contain SPEC and TECH_TEMPLATE hashes
    expect(packYaml).toContain('file: "SPEC.md"');
    expect(packYaml).toContain('file: "docs/TECH_TEMPLATE.md"');
    expect(packYaml).toMatch(/sha256: "[a-f0-9]{64}"/);

    // decisions should contain version string
    expect(packYaml).toContain("spec_to_tech_v1");

    // approvals.json should have valid schema
    const approvals = JSON.parse(
      readFileSync(join(evidenceDir, "approvals.json"), "utf-8"),
    );
    expect(approvals.schema_version).toBe("1");
    expect(approvals.status).toBe("PENDING");
    expect(approvals.scope.risk_level).toBe("LOW");
  });

  it("3. result-pm.md has EVIDENCE_PATH", () => {
    const resultPmPath = join(TEST_DIR, ".serena", "memories", "result-pm.md");
    expect(existsSync(resultPmPath)).toBe(true);

    const content = readFileSync(resultPmPath, "utf-8");
    expect(content).toContain("EVIDENCE_PATH: .serena/evidence/stt-run/T-STT/");
  });

  it("4. template missing -> exit 2", () => {
    // Temporarily rename template
    renameSync(TEMPLATE_PATH, TEMPLATE_BACKUP);
    try {
      const { exitCode } = runSpecToTech(
        `SPEC.md --run-id stt-miss --task-id T-MISS -w "${TEST_DIR}"`,
      );
      expect(exitCode).toBe(2);
    } finally {
      // Restore template
      renameSync(TEMPLATE_BACKUP, TEMPLATE_PATH);
    }
  });

  it("5. unreplaced tokens in template -> exit 1", () => {
    // Create a bad template with an extra unreplaced token
    const originalContent = readFileSync(TEMPLATE_PATH, "utf-8");
    writeFileSync(
      TEMPLATE_PATH,
      originalContent + "\n${EXTRA_UNKNOWN_TOKEN}\n",
      "utf-8",
    );
    try {
      // Clean previous output so this run generates fresh
      rmSync(join(TEST_DIR, "docs"), { recursive: true, force: true });
      const { exitCode } = runSpecToTech(
        `SPEC.md --run-id stt-bad --task-id T-BAD -w "${TEST_DIR}"`,
      );
      expect(exitCode).toBe(1);
    } finally {
      // Restore original template
      writeFileSync(TEMPLATE_PATH, originalContent, "utf-8");
    }
  });

  it("6. --dry-run -> no files created + exit 0", () => {
    const dryRunDir = join(tmpdir(), "hitl-spec-to-tech-dryrun");
    rmSync(dryRunDir, { recursive: true, force: true });
    mkdirSync(dryRunDir, { recursive: true });
    writeFileSync(join(dryRunDir, "SPEC.md"), "# Goal\nTest dry run.\n", "utf-8");

    try {
      const { exitCode } = runSpecToTech(
        `SPEC.md --run-id stt-dry --task-id T-DRY -w "${dryRunDir}" --dry-run`,
      );
      expect(exitCode).toBe(0);

      // No files should be created
      expect(existsSync(join(dryRunDir, "docs", "TECH.md"))).toBe(false);
      expect(
        existsSync(join(dryRunDir, ".serena", "evidence", "stt-dry", "T-DRY")),
      ).toBe(false);
      expect(
        existsSync(join(dryRunDir, ".serena", "memories", "result-pm.md")),
      ).toBe(false);
    } finally {
      rmSync(dryRunDir, { recursive: true, force: true });
    }
  });

  it("7. doctor --verify-gate --agent pm passes with APPROVED approvals", () => {
    // First ensure test 1 output exists, then update approvals to APPROVED
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
      expect(e.status).toBe(0);
    }
  });
});
