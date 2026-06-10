# ADR 0001: Complement Skillshare, Not Replace It

## Status
Accepted

## Context
We need to sync AI CLI tool configurations across devices and across tools (Claude Code ↔ Codex). Skillshare already handles skills, agents, rules, and commands via symlinks from `~/.config/skillshare/`. Our remaining needs — global instructions, MCP server inventories, hooks, plugins — are outside Skillshare's scope.

We considered three options:
1. Extend Skillshare's source directory with new subdirectories
2. Build a standalone tool that replaces Skillshare entirely
3. Build a standalone tool that complements Skillshare

## Decision
Option 3 — build Skill-Sync as a standalone CLI with its own source directory (`~/.config/skill-sync/`), complementing Skillshare. The two tools have non-overlapping domains and no runtime dependencies on each other.

## Consequences
- Skillshare continues to own skills/agents/rules. Skill-Sync never touches `~/.config/skillshare/`.
- Users manage two source directories. Both can live in the same dotfiles Git repo if desired.
- No coupling to Skillshare's release cycle or directory structure changes.
- If Skillshare later expands its scope to cover instructions or MCP, we re-evaluate the boundary.
