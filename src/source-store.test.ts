import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SourceStore } from './source-store.js';

describe('SourceStore', () => {
  let tempDir: string;
  let store: SourceStore;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'skill-sync-store-'));
    store = new SourceStore(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('init creates the full directory structure with .gitignore', () => {
    store.init();

    expect(existsSync(join(tempDir, 'instructions'))).toBe(true);
    expect(existsSync(join(tempDir, 'mcp'))).toBe(true);
    expect(existsSync(join(tempDir, 'plugins'))).toBe(true);
    expect(existsSync(join(tempDir, 'hooks'))).toBe(true);
    expect(existsSync(join(tempDir, 'rules'))).toBe(true);
    expect(existsSync(join(tempDir, 'backups'))).toBe(true);

    const gitignore = readFileSync(join(tempDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('backups/');
  });

  it('init is idempotent', () => {
    store.init();
    store.init();

    expect(existsSync(join(tempDir, 'instructions'))).toBe(true);
  });

  it('write then read produces identical data', () => {
    const data = {
      instructions: 'Use first-principles thinking.',
      mcpServers: [{
        name: 'context7',
        description: 'MCP server: context7',
        install: 'npx',
        requires_secret: true,
        source_tool: 'codex' as const,
        sync: true,
      }],
      plugins: [{
        name: 'claude-hud@claude-hud',
        description: 'Claude Code plugin: claude-hud',
        source: 'github:jarrodwatts/claude-hud',
        target_tool: 'claude' as const,
        sync: true,
      }],
      hooks: [{
        name: 'PreToolUse',
        description: 'Claude Code hook: PreToolUse',
        trigger: 'PreToolUse',
        target_tool: 'claude' as const,
        sync: true,
      }],
      rules: [{
        name: 'default',
        description: 'Codex rule: default',
        content: 'prefix_rule(pattern=["curl"], decision="allow")',
        source_tool: 'codex' as const,
        target_tool: 'codex' as const,
        sync: true,
      }],
    };

    store.write(data);
    const result = store.read();

    expect(result.instructions).toBe(data.instructions);
    expect(result.mcpServers).toEqual(data.mcpServers);
    expect(result.plugins).toEqual(data.plugins);
    expect(result.hooks).toEqual(data.hooks);
    expect(result.rules).toEqual(data.rules);
  });

  it('read returns empty collections when files do not exist', () => {
    store.init();
    const result = store.read();

    expect(result.instructions).toBeNull();
    expect(result.mcpServers).toEqual([]);
    expect(result.plugins).toEqual([]);
    expect(result.hooks).toEqual([]);
    expect(result.rules).toEqual([]);
  });

  it('preserves sync: false flags through write-read cycle', () => {
    const data = {
      instructions: null,
      mcpServers: [{
        name: 'node_repl',
        description: 'MCP server: node_repl',
        install: null,
        requires_secret: false,
        source_tool: 'codex' as const,
        sync: false,
      }],
      plugins: [],
      hooks: [],
      rules: [],
    };

    store.write(data);
    const result = store.read();

    expect(result.mcpServers[0].sync).toBe(false);
  });
});
