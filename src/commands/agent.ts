import { spawn as spawnProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import color from "picocolors";

// Helper to check if process with PID is running
function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (_e) {
    return false;
  }
}

export async function spawnAgent(
  agentId: string,
  promptFile: string,
  sessionId: string,
  workspace: string,
) {
  const resolvedPromptFile = path.resolve(promptFile);
  const resolvedWorkspace = path.resolve(workspace);

  if (!fs.existsSync(resolvedPromptFile)) {
    console.error(
      color.red(`ERROR: Prompt file not found: ${resolvedPromptFile}`),
    );
    process.exit(1);
  }

  if (!fs.existsSync(resolvedWorkspace)) {
    console.error(
      color.red(`ERROR: Workspace directory not found: ${resolvedWorkspace}`),
    );
    process.exit(1);
  }

  const logFile = `/tmp/subagent-${sessionId}-${agentId}.log`;
  const pidFile = `/tmp/subagent-${sessionId}-${agentId}.pid`;

  // Read prompt content
  const promptContent = fs.readFileSync(resolvedPromptFile, "utf-8");

  // Prepare log stream
  const logStream = fs.openSync(logFile, "w");

  console.log(color.blue(`[${agentId}] Spawning subagent...`));
  console.log(color.dim(`  Workspace: ${resolvedWorkspace}`));
  console.log(color.dim(`  Log: ${logFile}`));

  // Spawn gemini
  const child = spawnProcess("gemini", ["-p", promptContent, "--yolo"], {
    cwd: resolvedWorkspace,
    stdio: ["ignore", logStream, logStream], // Redirect stdout/stderr to log file
    detached: false, // We want to wait for it, behaving like the script
  });

  if (!child.pid) {
    console.error(color.red(`[${agentId}] Failed to spawn process`));
    process.exit(1);
  }

  // Write PID
  fs.writeFileSync(pidFile, child.pid.toString());
  console.log(color.green(`[${agentId}] Started with PID ${child.pid}`));

  const cleanup = () => {
    try {
      if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
      if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    } catch (_e) {
      // ignore
    }
  };

  // Handle signals to kill child
  const cleanAndExit = () => {
    if (child.pid && isProcessRunning(child.pid)) {
      process.kill(child.pid);
    }
    cleanup();
    process.exit();
  };

  process.on("SIGINT", cleanAndExit);
  process.on("SIGTERM", cleanAndExit);

  child.on("exit", (code) => {
    console.log(color.blue(`[${agentId}] Exited with code ${code}`));
    cleanup();
    process.exit(code ?? 0);
  });
}

export async function checkStatus(
  sessionId: string,
  agentIds: string[],
  rootPath: string = process.cwd(),
) {
  const results: Record<string, string> = {};

  for (const agent of agentIds) {
    const resultFile = path.join(
      rootPath,
      ".serena",
      "memories",
      `result-${agent}.md`,
    );
    const pidFile = `/tmp/subagent-${sessionId}-${agent}.pid`;

    if (fs.existsSync(resultFile)) {
      const content = fs.readFileSync(resultFile, "utf-8");
      // grep "^## Status:" "$RESULT" | head -1 | awk '{print $3}'
      const match = content.match(/^## Status:\s*(\S+)/m);
      if (match?.[1]) {
        // Use the status from the file to be more precise if possible
        // But script logic was:
        // STATUS=$(grep "^## Status:" "$RESULT" | head -1 | awk '{print $3}')
        // echo "${agent}:${STATUS}"
        results[agent] = match[1];
      } else {
        results[agent] = `completed`; // Fallback if status header missing but file exists
      }
    } else if (fs.existsSync(pidFile)) {
      // Logic for checking PID
      const pidContent = fs.readFileSync(pidFile, "utf-8").trim();
      const pid = parseInt(pidContent, 10);
      if (!Number.isNaN(pid) && isProcessRunning(pid)) {
        results[agent] = "running";
      } else {
        results[agent] = "crashed";
      }
    } else {
      results[agent] = "crashed"; // or "not_started" but script says "crashed"
    }
  }

  // Output in format comparable to script: "agent:status"
  for (const [agent, status] of Object.entries(results)) {
    console.log(`${agent}:${status}`);
  }
}
