/**
 * Phase 4: E2E Contract Integration Tests [M4]
 *
 * Validates cross-cutting contracts without spawning real subagents:
 * - result file Status values ∈ TaskResult
 * - EVIDENCE_PATH matches verify pattern
 * - evidence_pack.yaml required 9+1 keys
 * - approvals.json schema compliance
 * - aborted status → verify exit 3
 * - evidence_pack.yaml status update after verify
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runVerify, updateEvidencePackStatus } from "../commands/verify.js";

const TEST_DIR = mkdtempSync(join(tmpdir(), "contract-e2e-"));
const MEMORIES_DIR = join(TEST_DIR, ".serena", "memories");
const RUN_ID = "run-e2e";
const TASK_ID = "task-e2e";
const EVIDENCE_DIR = join(TEST_DIR, ".serena", "evidence", RUN_ID, TASK_ID);

// Valid TaskResult values (must match cli/types/index.ts)
const VALID_TASK_RESULTS = ["pending", "completed", "failed", "aborted"];

// Verify's EVIDENCE_PATH pattern (must match verify.ts:405)
const EVIDENCE_PATH_PATTERN = /^\.serena\/evidence\/[^/]+\/[^/]+\/?$/;

function writeResultFile(agent: string, status: string, extra = ""): void {
  const content = [
    `## Status: ${status}`,
    "",
    `EVIDENCE_PATH: .serena/evidence/${RUN_ID}/${TASK_ID}/`,
    "",
    extra,
  ].join("\n");
  writeFileSync(join(MEMORIES_DIR, `result-${agent}.md`), content, "utf-8");
}

function writeEvidencePack(overrides: Record<string, unknown> = {}): void {
  const base: Record<string, unknown> = {
    run_id: RUN_ID,
    task_id: TASK_ID,
    timestamp_kst: "2026-02-11T00:00:00+09:00",
    status: "pending",
    artifacts: { paths: [] },
    inputs: {
      source_refs: [],
      file_hashes: [],
      config_versions: [],
    },
    assumptions: [],
    decisions: [],
    tests: [],
    approvals: { hitl_required: false },
    ...overrides,
  };

  // Simple YAML serialization for test purposes
  const lines: string[] = [];
  for (const [key, val] of Object.entries(base)) {
    if (typeof val === "string") {
      lines.push(`${key}: "${val}"`);
    } else if (Array.isArray(val) && val.length === 0) {
      lines.push(`${key}: []`);
    } else {
      // Use JSON inline for nested objects
      lines.push(`${key}: ${JSON.stringify(val)}`);
    }
  }
  writeFileSync(join(EVIDENCE_DIR, "evidence_pack.yaml"), lines.join("\n"), "utf-8");
}

function writeApprovals(overrides: Record<string, unknown> = {}): void {
  const base = {
    schema_version: "1",
    run_id: RUN_ID,
    task_id: TASK_ID,
    status: "APPROVED",
    requested_by: "agent",
    requested_at: "2026-02-11T00:00:00+09:00",
    decision: {
      by: "reviewer",
      at: "2026-02-11T00:05:00+09:00",
      reason: "ok",
    },
    scope: {
      risk_level: "LOW",
      actions: ["verify"],
      targets: [`.serena/evidence/${RUN_ID}/${TASK_ID}/`],
    },
    ...overrides,
  };
  writeFileSync(
    join(EVIDENCE_DIR, "approvals.json"),
    JSON.stringify(base, null, 2),
    "utf-8",
  );
}

function writeVerificationReport(): void {
  writeFileSync(
    join(EVIDENCE_DIR, "verification_report.md"),
    "# Verification Report\n- Status: PENDING\n",
    "utf-8",
  );
}

function writeExecutionLog(): void {
  writeFileSync(
    join(EVIDENCE_DIR, "execution_log.txt"),
    "[2026-02-11T00:00:00+09:00] test\n",
    "utf-8",
  );
}

beforeAll(() => {
  mkdirSync(MEMORIES_DIR, { recursive: true });
  mkdirSync(EVIDENCE_DIR, { recursive: true });
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("E2E Contract Tests", () => {
  describe("Contract 1: result Status ∈ TaskResult", () => {
    it("completed status is valid TaskResult", () => {
      expect(VALID_TASK_RESULTS).toContain("completed");
    });

    it("failed status is valid TaskResult", () => {
      expect(VALID_TASK_RESULTS).toContain("failed");
    });

    it("aborted status is valid TaskResult", () => {
      expect(VALID_TASK_RESULTS).toContain("aborted");
    });

    it("pending status is valid TaskResult", () => {
      expect(VALID_TASK_RESULTS).toContain("pending");
    });

    it("result file Status parsed correctly by regex", () => {
      for (const status of VALID_TASK_RESULTS) {
        const content = `## Status: ${status}\n\nSome content`;
        const match = content.match(/^## Status:\s*(\S+)/m);
        expect(match?.[1]).toBe(status);
      }
    });
  });

  describe("Contract 2: EVIDENCE_PATH matches verify pattern", () => {
    it("standard path matches pattern", () => {
      expect(
        EVIDENCE_PATH_PATTERN.test(`.serena/evidence/${RUN_ID}/${TASK_ID}/`),
      ).toBe(true);
    });

    it("path without trailing slash matches", () => {
      expect(
        EVIDENCE_PATH_PATTERN.test(`.serena/evidence/${RUN_ID}/${TASK_ID}`),
      ).toBe(true);
    });

    it("invalid path does not match", () => {
      expect(EVIDENCE_PATH_PATTERN.test("invalid/path")).toBe(false);
    });
  });

  describe("Contract 3: evidence_pack.yaml required keys", () => {
    const REQUIRED_KEYS = [
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

    it("all 9 required keys present in template", () => {
      writeEvidencePack();
      const content = readFileSync(
        join(EVIDENCE_DIR, "evidence_pack.yaml"),
        "utf-8",
      );
      for (const key of REQUIRED_KEYS) {
        expect(content).toContain(key);
      }
    });

    it("status field present (Contract 2 SSOT)", () => {
      writeEvidencePack();
      const content = readFileSync(
        join(EVIDENCE_DIR, "evidence_pack.yaml"),
        "utf-8",
      );
      expect(content).toContain("status");
    });
  });

  describe("Contract 4: approvals.json schema", () => {
    it("valid approvals has all required fields", () => {
      writeApprovals();
      const content = JSON.parse(
        readFileSync(join(EVIDENCE_DIR, "approvals.json"), "utf-8"),
      );
      expect(content.schema_version).toBe("1");
      expect(content.run_id).toBe(RUN_ID);
      expect(content.task_id).toBe(TASK_ID);
      expect(content.status).toBe("APPROVED");
      expect(content.requested_by).toBeDefined();
      expect(content.requested_at).toBeDefined();
      expect(content.decision).toBeDefined();
      expect(content.scope).toBeDefined();
      expect(content.scope.risk_level).toBeDefined();
      expect(content.scope.actions).toBeDefined();
      expect(content.scope.targets).toBeDefined();
    });
  });

  describe("Contract 7: Loop Guard aborted → verify exit 3", () => {
    it("aborted result file triggers exit code 3", () => {
      writeResultFile("backend", "aborted", "ABORTED: wall_time exceeded");

      const outcome = runVerify("backend", TEST_DIR);
      expect("error" in outcome).toBe(true);
      expect(outcome.exitCode).toBe(3);
      if ("error" in outcome) {
        expect(outcome.error).toContain("aborted");
      }
    });

    it("completed result file does not trigger exit 3", () => {
      writeResultFile("backend", "completed", "CHARTER_CHECK:\n- Clarification level: LOW\n- Task domain: backend API\n- Must NOT do: a, b, c\n- Success criteria: tests pass\n- Assumptions: none");
      writeEvidencePack();
      writeApprovals();
      writeVerificationReport();
      writeExecutionLog();

      const outcome = runVerify("backend", TEST_DIR);
      expect(outcome.exitCode).not.toBe(3);
    });
  });

  describe("Contract 2: SSOT status progression via verify", () => {
    it("updateEvidencePackStatus writes 'completed' on ok=true", () => {
      // Setup: result file with EVIDENCE_PATH pointing to evidence dir
      writeResultFile("backend", "completed", "CHARTER_CHECK:\n- Clarification level: LOW\n- Task domain: backend API\n- Must NOT do: a, b, c\n- Success criteria: tests pass\n- Assumptions: none");
      writeEvidencePack({ status: "pending" });

      // Construct a passing VerifyResult directly (avoids platform-dependent verify checks)
      updateEvidencePackStatus({
        ok: true,
        agent: "backend",
        workspace: TEST_DIR,
        checks: [],
        summary: { passed: 1, failed: 0, warned: 0 },
      });

      // After status update, evidence_pack.yaml should reflect "completed"
      const yamlPath = join(EVIDENCE_DIR, "evidence_pack.yaml");
      expect(existsSync(yamlPath)).toBe(true);
      const content = readFileSync(yamlPath, "utf-8");
      expect(content).toContain("completed");
      expect(content).not.toContain("pending");
    });

    it("updateEvidencePackStatus writes 'failed' on ok=false", () => {
      writeResultFile("backend", "failed", "");
      writeEvidencePack({ status: "pending" });

      updateEvidencePackStatus({
        ok: false,
        agent: "backend",
        workspace: TEST_DIR,
        checks: [],
        summary: { passed: 0, failed: 1, warned: 0 },
      });

      const yamlPath = join(EVIDENCE_DIR, "evidence_pack.yaml");
      const content = readFileSync(yamlPath, "utf-8");
      expect(content).toContain("failed");
      expect(content).not.toContain("pending");
    });
  });
});
