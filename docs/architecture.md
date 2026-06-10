# Skill-Sync Architecture

## Overview

Skill-Sync is a Node.js CLI tool that synchronizes AI CLI tool configurations across devices and across tools (Claude Code ↔ Codex). It complements Skillshare, which handles skills/agents/rules.

```
┌─────────────────────────────────────────────────┐
│              Source of Truth                     │
│         ~/.config/skill-sync/                    │
│                                                  │
│  instructions/global.md    ← full content        │
│  mcp/servers.yaml          ← inventory list      │
│  plugins/plugins.yaml      ← inventory list      │
│  hooks/hooks.yaml          ← inventory list      │
│  rules/rules.yaml          ← inventory list      │
│  backups/                  ← .gitignored         │
│  .gitignore                                      │
└──────────────┬──────────────────┬────────────────┘
               │                  │
          scan ↑ apply ↓     git push/pull
               │                  │
    ┌──────────┴──────┐   ┌──────┴──────────┐
    │  Current Device  │   │  Other Devices   │
    │                  │   │                  │
    │ ~/.claude/       │   │  Same structure  │
    │   CLAUDE.md      │   │                  │
    │   plugins/       │   │                  │
    │                  │   │                  │
    │ ~/.codex/        │   │                  │
    │   AGENTS.md      │   │                  │
    │   config.toml    │   │                  │
    │   rules/         │   │                  │
    └─────────────────-┘   └─────────────────┘
```

## Command Flow

### `skill-sync scan`

1. Detect if `~/.claude/` and `~/.codex/` exist
2. Read `~/.claude/CLAUDE.md` → offer to adopt as `instructions/global.md`
3. Parse `~/.codex/config.toml` → extract MCP server names and commands (skip secret-bearing args)
4. Scan `~/.claude/plugins/installed_plugins.json` → filter out official plugins → build plugin inventory
5. Scan `~/.codex/config.toml` `[plugins.*]` → filter out official plugins → build plugin inventory
6. Scan for hooks, rules in both tool directories
7. Write/update YAML inventory files in `~/.config/skill-sync/`
8. Print summary of what was found

### `skill-sync diff`

1. Read source of truth from `~/.config/skill-sync/`
2. Read current machine state from `~/.claude/` and `~/.codex/`
3. Compare:
   - `instructions/global.md` vs `~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md`
   - Inventory lists vs what's actually installed
4. Print unified diff for instructions
5. Print table of inventory differences (present in source but missing on machine, present on machine but missing in source)

### `skill-sync apply`

1. Read source of truth
2. Run diff internally
3. For instructions: show diff, ask confirmation (unless `--force`), backup existing file, write new file
4. For inventory items (MCP, plugins, hooks, rules): print checklist of what needs to be installed/configured, with `sync: true` items highlighted
5. Return exit code 0 on success

## Directory Structure — Source of Truth

```
~/.config/skill-sync/
├── .gitignore              # excludes backups/
├── instructions/
│   └── global.md           # single canonical instruction file
├── mcp/
│   └── servers.yaml        # MCP server inventory
├── plugins/
│   └── plugins.yaml        # non-official plugin inventory
├── hooks/
│   └── hooks.yaml          # hook inventory
├── rules/
│   └── rules.yaml          # rule inventory
└── backups/                # auto-created on apply
    └── 2026-06-10T12-00-00/
        ├── claude--CLAUDE.md
        └── codex--AGENTS.md
```

## Technology Stack

- Runtime: Node.js (>=20)
- Language: TypeScript
- CLI framework: commander or yargs
- YAML parsing: js-yaml
- TOML parsing: @iarna/toml (for reading Codex config.toml)
- Diff: diff (npm package) for text diffing
- Distribution: npm install -g skill-sync

## Security Model

1. **Never read secret fields** — when parsing MCP config from config.toml, only extract `name` and `command`. Args that look like API keys, tokens, or credentials are not read into memory.
2. **Never store secrets** — inventory YAML files contain `requires_secret: true/false` flags, never actual values.
3. **Backup before overwrite** — every `apply` creates timestamped backups in a .gitignored directory.
4. **Confirm before overwrite** — default interactive mode shows diff and waits for user confirmation. `--force` skips confirmation but still creates backup.
5. **No remote communication** — the tool is purely local filesystem operations. Cross-device sync is done via user's own Git workflow.

## Skill Wrapper

A thin Claude Code skill (`/skill-sync`) that:
1. Calls `skill-sync scan`, `skill-sync diff`, or `skill-sync apply` via shell
2. Presents results in conversational form
3. For inventory items marked `requires_secret: true`, the LLM guides the user through manual configuration

The skill is optional — the CLI works standalone.
