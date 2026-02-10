import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { validateApprovalsFile } from "../commands/verify.js";

const TEST_DIR = join(tmpdir(), "hitl-verify-test");

function writeTempApprovals(filename: string, content: string): string {
  const filePath = join(TEST_DIR, filename);
  writeFileSync(filePath, content, "utf-8");
  return filePath;
}

function makeApprovals(overrides: Record<string, unknown> = {}): string {
  const base = {
    schema_version: "1",
    run_id: "RUN_TEST",
    task_id: "T-001",
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
      targets: [".serena/evidence/RUN_TEST/T-001/"],
    },
    ...overrides,
  };
  return JSON.stringify(base, null, 2);
}

beforeAll(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("validateApprovalsFile", () => {
  it("1. file not found -> fail", () => {
    const result = validateApprovalsFile(join(TEST_DIR, "nonexistent.json"));
    expect(result.ok).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("2. invalid JSON -> fail", () => {
    const path = writeTempApprovals("bad-json.json", "{ broken json");
    const result = validateApprovalsFile(path);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("not valid JSON");
  });

  it("3. missing required keys -> fail", () => {
    const path = writeTempApprovals(
      "missing-keys.json",
      JSON.stringify({ status: "APPROVED" }),
    );
    const result = validateApprovalsFile(path);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Missing keys");
  });

  it("4. invalid status value -> fail", () => {
    const path = writeTempApprovals(
      "bad-status.json",
      makeApprovals({ status: "UNKNOWN" }),
    );
    const result = validateApprovalsFile(path);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Invalid status");
  });

  it("5. PENDING -> fail", () => {
    const path = writeTempApprovals(
      "pending.json",
      makeApprovals({
        status: "PENDING",
        decision: { by: null, at: null, reason: null },
      }),
    );
    const result = validateApprovalsFile(path);
    expect(result.ok).toBe(false);
    expect(result.status).toBe("PENDING");
    expect(result.error).toContain("approval required");
  });

  it("6. APPROVED + decision.by/at null -> fail", () => {
    const path = writeTempApprovals(
      "no-decision.json",
      makeApprovals({
        status: "APPROVED",
        decision: { by: null, at: null, reason: null },
      }),
    );
    const result = validateApprovalsFile(path);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("decision.by and decision.at");
  });

  it("7. APPROVED + scope.risk_level missing -> fail", () => {
    const path = writeTempApprovals(
      "no-risk.json",
      makeApprovals({
        scope: {
          actions: ["verify"],
          targets: [".serena/evidence/RUN_TEST/T-001/"],
        },
      }),
    );
    const result = validateApprovalsFile(path);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("risk_level");
  });

  it("8. APPROVED + scope.risk_level=CRITICAL -> fail", () => {
    const path = writeTempApprovals(
      "bad-risk.json",
      makeApprovals({
        scope: {
          risk_level: "CRITICAL",
          actions: ["verify"],
          targets: [".serena/evidence/RUN_TEST/T-001/"],
        },
      }),
    );
    const result = validateApprovalsFile(path);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("risk_level");
  });

  it("9. APPROVED + scope.actions=[] -> fail", () => {
    const path = writeTempApprovals(
      "empty-actions.json",
      makeApprovals({
        scope: {
          risk_level: "LOW",
          actions: [],
          targets: [".serena/evidence/RUN_TEST/T-001/"],
        },
      }),
    );
    const result = validateApprovalsFile(path);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("scope.actions");
  });

  it("10. APPROVED + scope.targets=[] -> fail", () => {
    const path = writeTempApprovals(
      "empty-targets.json",
      makeApprovals({
        scope: {
          risk_level: "LOW",
          actions: ["verify"],
          targets: [],
        },
      }),
    );
    const result = validateApprovalsFile(path);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("scope.targets");
  });

  it("11. APPROVED + valid schema -> pass", () => {
    const path = writeTempApprovals("valid.json", makeApprovals());
    const result = validateApprovalsFile(path);
    expect(result.ok).toBe(true);
    expect(result.status).toBe("APPROVED");
    expect(result.error).toBeNull();
  });
});
