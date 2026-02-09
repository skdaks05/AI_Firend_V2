---
title: Installation
description: Prerequisites, install options, and first-run setup.
---

# Installation

## Prerequisites

- Google Antigravity (2026+)
- Bun
- uv

## Option 1: Interactive Install

```bash
bunx oh-my-ag
```

Installs skills and workflows into `.agent/` in the current project.

## Option 2: Global Install

```bash
bun install --global oh-my-ag
```

Recommended if you use orchestrator commands frequently.

## Option 3: Existing Project Integration

### CLI path

```bash
bunx oh-my-ag
bunx oh-my-ag doctor
```

### Manual copy path

```bash
cp -r oh-my-ag/.agent/skills /path/to/project/.agent/
cp -r oh-my-ag/.agent/workflows /path/to/project/.agent/
cp -r oh-my-ag/.agent/config /path/to/project/.agent/
```

## Initial Setup Command

```text
/setup
```

Creates `.agent/config/user-preferences.yaml`.

## Required CLI Vendors

Install and authenticate at least one:

- Gemini
- Claude
- Codex
- Qwen
