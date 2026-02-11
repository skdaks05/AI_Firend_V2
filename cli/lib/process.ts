/**
 * Thin wrapper around node:child_process to isolate Bun/@types/node
 * type conflicts (bun.lock has @types/node 20 and 25 coexisting).
 *
 * All process spawning in the CLI goes through spawnVendor() so that
 * `as any` casts are contained in this single file.
 */
import { spawn } from "node:child_process";

export interface SpawnOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
  shell?: boolean;
  detached?: boolean;
  stdio?: Array<"ignore" | "pipe" | number>;
}

export interface SpawnResult {
  on(event: "exit", cb: (code: number | null) => void): void;
  on(event: "error", cb: (err: Error) => void): void;
  kill(signal?: string): boolean;
  readonly pid?: number;
}

export function spawnVendor(
  cmd: string,
  args: string[],
  opts?: SpawnOptions,
): SpawnResult {
  const child = spawn(cmd, args, opts as any);
  return child as unknown as SpawnResult;
}
