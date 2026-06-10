# Implementation Plan

## Phase 1: MVP — Core CLI

### Milestone 1: Project scaffold
- [ ] Initialize Node.js project with TypeScript
- [ ] Set up tsconfig, eslint, build scripts
- [ ] Add dependencies: commander, js-yaml, @iarna/toml, diff
- [ ] Create CLI entry point with `scan`, `diff`, `apply` subcommands

### Milestone 2: Scanner
- [ ] Detect `~/.claude/` and `~/.codex/` existence
- [ ] Read `~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md`
- [ ] Parse `~/.codex/config.toml` — extract MCP server names and commands only (skip args containing secrets)
- [ ] Parse `~/.claude/plugins/installed_plugins.json` — filter official plugins
- [ ] Parse `~/.codex/config.toml` `[plugins.*]` — filter official plugins
- [ ] Scan `~/.codex/rules/` for rule files
- [ ] Detect hooks from both tools (if any configured)
- [ ] Define official plugin allowlists for both tools
- [ ] Write results to `~/.config/skill-sync/` as YAML files
- [ ] If `instructions/global.md` doesn't exist, offer to adopt the current CLAUDE.md or AGENTS.md
- [ ] Print human-readable summary

### Milestone 3: Diff
- [ ] Compare `instructions/global.md` against `~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md`
- [ ] Compare inventory lists against actual installed state
- [ ] Print unified diff for instruction files
- [ ] Print table for inventory differences (missing / extra / mismatched)

### Milestone 4: Apply
- [ ] Create `~/.config/skill-sync/backups/` with .gitignore
- [ ] Backup existing target files with timestamp
- [ ] Write `global.md` → `~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md`
- [ ] Interactive confirmation with diff display (default)
- [ ] `--force` flag to skip confirmation
- [ ] Print checklist of inventory items that need manual setup
- [ ] Highlight items with `requires_secret: true`
- [ ] Skip items with `sync: false`

### Milestone 5: Polish
- [ ] `skill-sync init` — create `~/.config/skill-sync/` directory structure + .gitignore
- [ ] `--dry-run` flag for apply
- [ ] Colored terminal output
- [ ] `--help` for all commands
- [ ] npm packaging and `bin` entry point

## Phase 2: Skill Wrapper

- [ ] Create Claude Code skill (`/skill-sync`) that wraps CLI commands
- [ ] Present scan results conversationally
- [ ] Guide user through MCP/plugin setup for `requires_secret` items
- [ ] Optionally create Codex-compatible skill entry

## Phase 3: Enhancements (post-MVP)

- [ ] Project-level config support
- [ ] `skill-sync watch` — file watcher for auto-scan on changes
- [ ] Cross-platform path handling (Linux, WSL, Windows)
- [ ] Integration tests with mock `~/.claude/` and `~/.codex/` directories

## Migration Strategy

For your current multi-machine setup:

1. **On your primary machine (this Mac):**
   ```
   skill-sync init
   skill-sync scan
   # review and adjust sync flags in the generated YAML files
   cd ~/.config/skill-sync && git init && git add -A && git commit -m "initial config"
   # push to a private repo
   ```

2. **On each additional device:**
   ```
   git clone <repo> ~/.config/skill-sync
   npm install -g skill-sync
   skill-sync diff          # see what's different
   skill-sync apply         # apply instructions, get checklist for the rest
   ```

3. **Ongoing sync:**
   - Edit `~/.config/skill-sync/instructions/global.md` for instruction changes
   - Run `skill-sync scan` after installing new MCP/plugins to update inventory
   - `git commit && git push` to propagate
   - `git pull && skill-sync apply` on other devices
