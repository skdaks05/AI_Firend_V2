export interface ManifestFile {
  path: string;
  sha256: string;
  size: number;
}

export const AGENT_TYPES = [
  "frontend",
  "backend",
  "mobile",
  "qa",
  "debug",
  "pm",
] as const;

export type AgentType = (typeof AGENT_TYPES)[number];

export const EXTENDED_AGENTS = [
  "orchestrator",
  "workflow-guide",
  "commit",
] as const;

export type ExtendedAgent = (typeof EXTENDED_AGENTS)[number];

export type ProcessStatus = "running" | "exited" | "crashed";
export type TaskResult = "pending" | "completed" | "failed" | "aborted";

export interface Manifest {
  name: string;
  version: string;
  releaseDate: string;
  repository: string;
  files: ManifestFile[];
}

export interface CLICheck {
  name: string;
  installed: boolean;
  version?: string;
  installCmd: string;
}

export interface SkillCheck {
  name: string;
  installed: boolean;
  hasSkillMd: boolean;
}

export interface Metrics {
  sessions: number;
  skillsUsed: Record<string, number>;
  tasksCompleted: number;
  totalSessionTime: number;
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  lastUpdated: string;
  startDate: string;
  lastSessionId?: string;
  lastSessionStatus?: string;
  lastSessionStarted?: string;
  lastSessionDuration?: number;
}

export interface Retrospective {
  id: string;
  date: string;
  summary: string;
  keyLearnings: string[];
  filesChanged: string[];
  nextSteps: string[];
}

export interface CleanupResult {
  cleaned: number;
  skipped: number;
  details: string[];
}

export interface SkillInfo {
  name: string;
  desc: string;
}

export interface SkillsRegistry {
  domain: SkillInfo[];
  coordination: SkillInfo[];
  utility: SkillInfo[];
}

export interface LoopGuard {
  max_retry: number; // default 3
  max_wall_time_sec: number; // default 3600
}

export interface VerifyCheck {
  name: string;
  status: "pass" | "fail" | "warn" | "skip";
  message?: string;
}

export interface VerifyResult {
  ok: boolean;
  agent: string;
  workspace: string;
  checks: VerifyCheck[];
  summary: {
    passed: number;
    failed: number;
    warned: number;
  };
}
