import * as child_process from "node:child_process";
import type * as fs from "node:fs";
import path from "node:path";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import { checkStatus, spawnAgent } from "../commands/agent.js";

const MOCK_WORKSPACE = "/tmp";
const RESOLVED_WORKSPACE = path.resolve(MOCK_WORKSPACE);

// Hoist mocks to allow usage in vi.mock
const mockFsFunctions = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  openSync: vi.fn(),
  closeSync: vi.fn(),
  statSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
}));

vi.mock("node:fs", async () => {
  return {
    default: mockFsFunctions,
    ...mockFsFunctions,
  };
});

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
  execSync: vi.fn(),
}));

describe("agent command", () => {
  let processKillSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock process.kill globally
    processKillSpy = vi.spyOn(process, "kill").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("spawnAgent", () => {
    it("should exit if spawn returns no pid", async () => {
      mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
        const target = pathArg.toString();
        if (target === RESOLVED_WORKSPACE) return true;
        return false;
      });
      mockFsFunctions.statSync.mockImplementation((pathArg: fs.PathLike) => {
        const target = pathArg.toString();
        if (target === RESOLVED_WORKSPACE)
          return { isDirectory: () => true, isFile: () => false };
        return { isDirectory: () => false, isFile: () => false };
      });
      mockFsFunctions.openSync.mockReturnValue(123);

      const mockChild = { pid: undefined, on: vi.fn(), unref: vi.fn() };
      vi.mocked(child_process.spawn).mockReturnValue(
        mockChild as unknown as child_process.ChildProcess,
      );

      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(
          (_code?: string | number | null | undefined): never => {
            throw new Error("exit");
          },
        );

      await expect(
        spawnAgent("agent1", "prompt.md", "session1", MOCK_WORKSPACE),
      ).rejects.toThrow("exit");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("should spawn process and write PID", async () => {
      mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
        const target = pathArg.toString();
        if (target.includes("user-preferences.yaml")) return false;
        if (target.includes("cli-config.yaml")) return false;
        if (target.includes("prompt.md")) return true;
        if (target === RESOLVED_WORKSPACE) return true;
        return false;
      });
      mockFsFunctions.statSync.mockImplementation((pathArg: fs.PathLike) => {
        const target = pathArg.toString();
        if (target.includes("prompt.md"))
          return { isDirectory: () => false, isFile: () => true };
        if (target === RESOLVED_WORKSPACE)
          return { isDirectory: () => true, isFile: () => false };
        return { isDirectory: () => false, isFile: () => false };
      });
      mockFsFunctions.readFileSync.mockImplementation(
        (pathArg: fs.PathLike) => {
          const target = pathArg.toString();
          if (target.includes("prompt.md")) return "prompt content";
          return "";
        },
      );
      mockFsFunctions.openSync.mockReturnValue(123);

      const mockChild = {
        pid: 12345,
        on: vi.fn(),
        unref: vi.fn(),
      };
      vi.mocked(child_process.spawn).mockReturnValue(
        mockChild as unknown as child_process.ChildProcess,
      );

      await spawnAgent("agent1", "prompt.md", "session1", MOCK_WORKSPACE);

      expect(child_process.spawn).toHaveBeenCalledWith(
        "gemini",
        expect.arrayContaining(["-p", "prompt content"]),
        expect.objectContaining({ cwd: RESOLVED_WORKSPACE }),
      );
      expect(mockFsFunctions.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(".pid"),
        "12345",
      );
    });

    it("should resolve config/result paths from project root when cwd is nested", async () => {
      const nestedCwd = "C:\\repo\\cli";
      const projectRoot = "C:\\repo";
      const rootMarker = path.join(projectRoot, ".agent");
      const cliConfigPath = path.join(
        projectRoot,
        ".agent",
        "skills",
        "orchestrator",
        "config",
        "cli-config.yaml",
      );

      const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(nestedCwd);

      mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) => {
        const target = pathArg.toString();
        if (target === rootMarker) return true;
        if (target === cliConfigPath) return true;
        if (target === RESOLVED_WORKSPACE) return true;
        return false;
      });
      mockFsFunctions.readFileSync.mockImplementation(
        (pathArg: fs.PathLike) => {
          const target = pathArg.toString();
          if (target === cliConfigPath) {
            return [
              "active_vendor: gemini",
              "vendors:",
              "  gemini:",
              '    command: "gemini"',
              '    prompt_flag: "none"',
              '    auto_approve_flag: "--approval-mode=yolo"',
              '    output_format_flag: "--output-format"',
              '    output_format: "json"',
            ].join("\n");
          }
          return "";
        },
      );
      mockFsFunctions.openSync.mockReturnValue(123);

      let exitHandler: ((code: number | null) => void) | undefined;
      const mockChild = {
        pid: 54321,
        on: vi.fn((event: string, cb: (arg: unknown) => void) => {
          if (event === "exit") {
            exitHandler = cb as (code: number | null) => void;
          }
          return mockChild;
        }),
        kill: vi.fn(),
      };
      vi.mocked(child_process.spawn).mockReturnValue(
        mockChild as unknown as child_process.ChildProcess,
      );

      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(
          (_code?: string | number | null | undefined): never => {
            throw new Error("exit");
          },
        );

      const promptWithEvidence = [
        "inline prompt",
        "EVIDENCE_PATH: .serena/evidence/run-123/task-456/",
      ].join("\n");

      await spawnAgent("backend", promptWithEvidence, "session2", MOCK_WORKSPACE);
      expect(exitHandler).toBeDefined();

      // Trigger child completion path to verify result file destination.
      expect(() => exitHandler?.(0)).toThrow("exit");

      const spawnArgs = vi.mocked(child_process.spawn).mock.calls[0]?.[1] as
        | string[]
        | undefined;
      expect(spawnArgs).toBeDefined();
      expect(spawnArgs?.includes("-p")).toBe(false);
      expect(spawnArgs).toEqual(
        expect.arrayContaining([
          "--output-format",
          "json",
          "--approval-mode=yolo",
          promptWithEvidence,
        ]),
      );

      const resultWriteCall = mockFsFunctions.writeFileSync.mock.calls.find(
        (call) => call[0].toString().includes("result-backend.md"),
      );
      expect(resultWriteCall).toBeDefined();
      expect(resultWriteCall?.[0].toString()).toBe(
        path.join(projectRoot, ".serena", "memories", "result-backend.md"),
      );
      expect(resultWriteCall?.[1].toString()).toContain(
        "EVIDENCE_PATH: .serena/evidence/run-123/task-456/",
      );

      expect(exitSpy).toHaveBeenCalledWith(0);
      cwdSpy.mockRestore();
    });
  });

  describe("checkStatus", () => {
    it("should report correct status from result file", async () => {
      mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) =>
        pathArg.toString().includes("result-"),
      );
      mockFsFunctions.readFileSync.mockReturnValue(
        "## Status: completed\nSome detail",
      );

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await checkStatus("session1", ["agent1"]);

      expect(consoleSpy).toHaveBeenCalledWith("agent1:completed");
    });

    it("should fallback to PID check if result file missing", async () => {
      mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) =>
        pathArg.toString().includes(".pid"),
      );
      mockFsFunctions.readFileSync.mockReturnValue("9999");

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await checkStatus("session1", ["agent1"]);

      // Verify process.kill was called
      expect(processKillSpy).toHaveBeenCalledWith(9999, 0);
      expect(consoleSpy).toHaveBeenCalledWith("agent1:running");
    });

    it("should report crashed if PID not running", async () => {
      mockFsFunctions.existsSync.mockImplementation((pathArg: fs.PathLike) =>
        pathArg.toString().includes(".pid"),
      );
      mockFsFunctions.readFileSync.mockReturnValue("8888");

      // Mock process.kill to throw (process not running)
      processKillSpy.mockImplementation(() => {
        throw new Error("Not running");
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await checkStatus("session1", ["agent1"]);

      expect(processKillSpy).toHaveBeenCalledWith(8888, 0);
      expect(consoleSpy).toHaveBeenCalledWith("agent1:crashed");
    });
  });
});
