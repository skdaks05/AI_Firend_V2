#!/bin/bash
# spawn-agent.sh - Wrapper for oh-my-ag agent:spawn
# Usage: ./spawn-agent.sh <agent-id> <prompt-or-file> [workspace] [--vendor <vendor>]

set -euo pipefail

usage() {
  echo "Usage: spawn-agent.sh <agent-id> <prompt-or-file> [workspace] [--vendor <vendor>]"
  echo ""
  echo "Examples:"
  echo "  spawn-agent.sh backend \"Implement auth API\" ./apps/api"
  echo "  spawn-agent.sh qa .agent/tasks/qa-review.md . --vendor claude"
}

if [[ $# -lt 2 ]]; then
  usage
  exit 1
fi

if ! command -v oh-my-ag >/dev/null 2>&1; then
  echo "Error: 'oh-my-ag' command not found in PATH."
  echo "Install it first: bun install --global oh-my-ag"
  exit 1
fi

AGENT_ID="$1"
PROMPT="$2"
shift 2

WORKSPACE="."
if [[ $# -gt 0 && "${1}" != -* ]]; then
  WORKSPACE="$1"
  shift
fi

SESSION_ID="${OH_MY_AG_SESSION_ID:-session-$(date +%Y%m%d-%H%M%S)-$$}"

exec oh-my-ag agent:spawn "$AGENT_ID" "$PROMPT" "$SESSION_ID" -w "$WORKSPACE" "$@"

