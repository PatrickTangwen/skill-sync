import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scanInstructions, scanMcpServers, scanPlugins, scanHooksAndRules } from './scanner.js';

describe('scanInstructions', () => {
  let tempHome: string;

  beforeEach(() => {
    tempHome = mkdtempSync(join(tmpdir(), 'skill-sync-test-'));
  });

  afterEach(() => {
    rmSync(tempHome, { recursive: true, force: true });
  });

  it('detects CLAUDE.md and reads its content', () => {
    mkdirSync(join(tempHome, '.claude'), { recursive: true });
    writeFileSync(join(tempHome, '.claude', 'CLAUDE.md'), 'Use first-principles thinking.');

    const result = scanInstructions(tempHome);

    expect(result.claude.found).toBe(true);
    expect(result.claude.content).toBe('Use first-principles thinking.');
  });

  it('detects AGENTS.md and reads its content', () => {
    mkdirSync(join(tempHome, '.codex'), { recursive: true });
    writeFileSync(join(tempHome, '.codex', 'AGENTS.md'), 'Be pragmatic.');

    const result = scanInstructions(tempHome);

    expect(result.codex.found).toBe(true);
    expect(result.codex.content).toBe('Be pragmatic.');
  });

  it('handles missing directories gracefully', () => {
    const result = scanInstructions(tempHome);

    expect(result.claude.found).toBe(false);
    expect(result.claude.content).toBeNull();
    expect(result.codex.found).toBe(false);
    expect(result.codex.content).toBeNull();
  });
});

describe('scanMcpServers', () => {
  let tempHome: string;

  beforeEach(() => {
    tempHome = mkdtempSync(join(tmpdir(), 'skill-sync-test-'));
  });

  afterEach(() => {
    rmSync(tempHome, { recursive: true, force: true });
  });

  it('extracts MCP server name and command from Codex config.toml', () => {
    mkdirSync(join(tempHome, '.codex'), { recursive: true });
    writeFileSync(join(tempHome, '.codex', 'config.toml'), `
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp", "--api-key", "secret-key-123"]
`);

    const result = scanMcpServers(tempHome);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('context7');
    expect(result[0].install).toBe('npx');
    expect(result[0].source_tool).toBe('codex');
    expect(result[0].requires_secret).toBe(true);
  });

  it('never includes secret values in the result', () => {
    mkdirSync(join(tempHome, '.codex'), { recursive: true });
    writeFileSync(join(tempHome, '.codex', 'config.toml'), `
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp", "--api-key", "ctx7sk-ea9ddef6"]
`);

    const result = scanMcpServers(tempHome);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('ctx7sk-ea9ddef6');
    expect(serialized).not.toContain('api-key');
  });

  it('handles missing config.toml gracefully', () => {
    const result = scanMcpServers(tempHome);
    expect(result).toEqual([]);
  });

  it('infers requires_secret from env section', () => {
    mkdirSync(join(tempHome, '.codex'), { recursive: true });
    writeFileSync(join(tempHome, '.codex', 'config.toml'), `
[mcp_servers.node_repl]
command = "/path/to/node_repl"
args = []

[mcp_servers.node_repl.env]
CODEX_HOME = "/Users/test/.codex"
`);

    const result = scanMcpServers(tempHome);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('node_repl');
    expect(result[0].requires_secret).toBe(false);
  });
});

describe('scanPlugins', () => {
  let tempHome: string;

  beforeEach(() => {
    tempHome = mkdtempSync(join(tmpdir(), 'skill-sync-test-'));
  });

  afterEach(() => {
    rmSync(tempHome, { recursive: true, force: true });
  });

  it('detects non-official Claude plugins and filters out official ones', () => {
    mkdirSync(join(tempHome, '.claude', 'plugins'), { recursive: true });
    writeFileSync(join(tempHome, '.claude', 'plugins', 'installed_plugins.json'), JSON.stringify({
      version: 2,
      plugins: {
        'feature-dev@claude-plugins-official': [{ scope: 'user' }],
        'claude-hud@claude-hud': [{ scope: 'user' }],
      }
    }));
    writeFileSync(join(tempHome, '.claude', 'settings.json'), JSON.stringify({
      extraKnownMarketplaces: {
        'claude-hud': { source: { source: 'github', repo: 'jarrodwatts/claude-hud' } }
      }
    }));

    const result = scanPlugins(tempHome);
    const names = result.map(p => p.name);

    expect(names).toContain('claude-hud@claude-hud');
    expect(names).not.toContain('feature-dev@claude-plugins-official');
    expect(result.find(p => p.name === 'claude-hud@claude-hud')?.source).toBe('github:jarrodwatts/claude-hud');
  });

  it('detects non-official Codex plugins and filters out official ones', () => {
    mkdirSync(join(tempHome, '.codex'), { recursive: true });
    writeFileSync(join(tempHome, '.codex', 'config.toml'), `
[plugins."github@openai-curated"]
enabled = true

[plugins."my-custom@custom-marketplace"]
enabled = true
`);

    const result = scanPlugins(tempHome);
    const names = result.map(p => p.name);

    expect(names).toContain('my-custom@custom-marketplace');
    expect(names).not.toContain('github@openai-curated');
  });

  it('handles missing plugin files gracefully', () => {
    const result = scanPlugins(tempHome);
    expect(result).toEqual([]);
  });
});

describe('scanHooksAndRules', () => {
  let tempHome: string;

  beforeEach(() => {
    tempHome = mkdtempSync(join(tmpdir(), 'skill-sync-test-'));
  });

  afterEach(() => {
    rmSync(tempHome, { recursive: true, force: true });
  });

  it('detects Codex rule files', () => {
    mkdirSync(join(tempHome, '.codex', 'rules'), { recursive: true });
    writeFileSync(
      join(tempHome, '.codex', 'rules', 'default.rules'),
      'prefix_rule(pattern=["curl"], decision="allow")'
    );

    const result = scanHooksAndRules(tempHome);

    expect(result.rules).toHaveLength(1);
    expect(result.rules[0].name).toBe('default');
    expect(result.rules[0].content).toBe('prefix_rule(pattern=["curl"], decision="allow")');
    expect(result.rules[0].source_tool).toBe('codex');
  });

  it('detects hooks from Claude settings.json', () => {
    mkdirSync(join(tempHome, '.claude'), { recursive: true });
    writeFileSync(join(tempHome, '.claude', 'settings.json'), JSON.stringify({
      hooks: {
        PreToolUse: [{ matcher: 'Bash', hooks: ['echo pre-bash'] }]
      }
    }));

    const result = scanHooksAndRules(tempHome);

    expect(result.hooks).toHaveLength(1);
    expect(result.hooks[0].name).toBe('PreToolUse');
    expect(result.hooks[0].target_tool).toBe('claude');
  });

  it('handles missing directories gracefully', () => {
    const result = scanHooksAndRules(tempHome);
    expect(result.hooks).toEqual([]);
    expect(result.rules).toEqual([]);
  });
});
