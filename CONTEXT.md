# Skill-Sync Domain Glossary

## Terms

### Skill-Sync
The CLI tool and optional skill wrapper that synchronizes AI CLI tool configurations across devices and across tools (Claude Code, Codex). Complements Skillshare — does not replace it.

### Skillshare
Third-party CLI tool (`runkids/skillshare`) that manages skills, agents, rules, and commands across AI platforms via symlinks from a centralized source directory (`~/.config/skillshare/`). Skill-Sync treats Skillshare as a peer and does not touch its domain.

### Source of Truth
The canonical directory `~/.config/skill-sync/` containing all managed configuration files and inventory lists. Intended to be version-controlled via Git for cross-device sync.

### Instructions
Global instruction files that shape AI tool behavior. Stored as a single canonical file (`global.md`) in the source of truth, written verbatim to both `~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md` during apply.

### Inventory List
A YAML file recording what is installed (name, description, source, whether it requires secrets), without recording the actual configuration content or secrets. Used for MCP servers, hooks, plugins, and rules.

### Scan
The process of auto-detecting existing configurations on the current machine (`~/.claude/`, `~/.codex/`) and generating or updating inventory lists in the source of truth.

### Apply
The process of reading the source of truth and writing its contents to the appropriate tool-specific locations on the current machine. Always creates a backup before overwriting.

### Diff
Comparing the source of truth against the current machine's actual configuration state, showing what would change if apply were run.

### Sync Flag
A per-item `sync: true/false` marker in inventory lists, allowing users to selectively include or exclude individual items (MCP servers, plugins, hooks, rules) from synchronization.

### Official Plugin
A plugin shipped by the tool vendor (Anthropic for Claude Code, OpenAI for Codex). Official plugins are excluded from sync — only third-party / community plugins are tracked.

### Backup
A timestamped copy of a file that will be overwritten during apply. Stored centrally in `~/.config/skill-sync/backups/`, excluded from Git via `.gitignore`.

## Boundaries

### What Skill-Sync manages
- Global instruction file (one canonical source → both tools)
- MCP server inventory (names + descriptions, no secrets)
- Non-official plugin inventory
- Hook inventory
- Rule inventory

### What Skill-Sync does NOT manage
- Skills, agents, rules content → Skillshare's domain
- `settings.json` (Claude Code) → manual
- `config.toml` (Codex) → manual
- Project-level configs → already in Git per-repo
- Secrets, API keys, tokens → never read, never stored
- Official/vendor plugins → excluded by policy
