import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runInit, runScan, runDiff, runApply } from './commands.js';
import { SourceStore } from './source-store.js';

describe('runInit', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'skill-sync-cmd-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates the source of truth directory structure', () => {
    runInit(tempDir);

    expect(existsSync(join(tempDir, 'instructions'))).toBe(true);
    expect(existsSync(join(tempDir, 'mcp'))).toBe(true);
    expect(existsSync(join(tempDir, 'plugins'))).toBe(true);
    expect(existsSync(join(tempDir, 'hooks'))).toBe(true);
    expect(existsSync(join(tempDir, 'rules'))).toBe(true);
    expect(existsSync(join(tempDir, 'backups'))).toBe(true);
    expect(existsSync(join(tempDir, '.gitignore'))).toBe(true);
  });
});

describe('runScan', () => {
  let storeDir: string;
  let homeDir: string;

  beforeEach(() => {
    storeDir = mkdtempSync(join(tmpdir(), 'skill-sync-store-'));
    homeDir = mkdtempSync(join(tmpdir(), 'skill-sync-home-'));

    mkdirSync(join(homeDir, '.claude'), { recursive: true });
    writeFileSync(join(homeDir, '.claude', 'CLAUDE.md'), 'Be pragmatic.');

    mkdirSync(join(homeDir, '.codex', 'rules'), { recursive: true });
    writeFileSync(join(homeDir, '.codex', 'config.toml'), `
[mcp_servers.test-server]
command = "node"
args = ["server.js"]
`);
    writeFileSync(join(homeDir, '.codex', 'rules', 'default.rules'), 'allow curl');
  });

  afterEach(() => {
    rmSync(storeDir, { recursive: true, force: true });
    rmSync(homeDir, { recursive: true, force: true });
  });

  it('scans machine, writes inventory to store, and returns summary', () => {
    const summary = runScan(storeDir, homeDir);

    expect(summary).toContain('instructions: adopted');
    expect(summary).toContain('1 MCP servers');
    expect(summary).toContain('1 rules');

    const store = new SourceStore(storeDir);
    const data = store.read();
    expect(data.instructions).toBe('Be pragmatic.');
    expect(data.mcpServers).toHaveLength(1);
    expect(data.rules).toHaveLength(1);
  });

  it('does not duplicate items on repeated scans', () => {
    runScan(storeDir, homeDir);
    runScan(storeDir, homeDir);

    const store = new SourceStore(storeDir);
    const data = store.read();
    expect(data.mcpServers).toHaveLength(1);
    expect(data.rules).toHaveLength(1);
    expect(data.instructions).toBe('Be pragmatic.');
  });

  it('auto-inits when source directory does not exist', () => {
    const freshStore = join(storeDir, 'nested', 'store');
    runScan(freshStore, homeDir);

    expect(existsSync(join(freshStore, 'instructions'))).toBe(true);
    const store = new SourceStore(freshStore);
    const data = store.read();
    expect(data.mcpServers).toHaveLength(1);
  });
});

describe('runDiff', () => {
  let storeDir: string;
  let homeDir: string;

  beforeEach(() => {
    storeDir = mkdtempSync(join(tmpdir(), 'skill-sync-diff-'));
    homeDir = mkdtempSync(join(tmpdir(), 'skill-sync-home-'));
  });

  afterEach(() => {
    rmSync(storeDir, { recursive: true, force: true });
    rmSync(homeDir, { recursive: true, force: true });
  });

  it('reports no differences when source matches machine', () => {
    mkdirSync(join(homeDir, '.claude'), { recursive: true });
    writeFileSync(join(homeDir, '.claude', 'CLAUDE.md'), 'Same content.');
    mkdirSync(join(homeDir, '.codex'), { recursive: true });
    writeFileSync(join(homeDir, '.codex', 'AGENTS.md'), 'Same content.');

    const store = new SourceStore(storeDir);
    store.write({
      instructions: 'Same content.',
      mcpServers: [], plugins: [], hooks: [], rules: [],
    });

    const result = runDiff(storeDir, homeDir);

    expect(result.hasDifferences).toBe(false);
    expect(result.output).toContain('No differences found');
  });

  it('shows instruction diff with color codes when content differs', () => {
    mkdirSync(join(homeDir, '.claude'), { recursive: true });
    writeFileSync(join(homeDir, '.claude', 'CLAUDE.md'), 'Old content.');

    const store = new SourceStore(storeDir);
    store.write({
      instructions: 'New content.',
      mcpServers: [], plugins: [], hooks: [], rules: [],
    });

    const result = runDiff(storeDir, homeDir);

    expect(result.hasDifferences).toBe(true);
    expect(result.output).toContain('claude');
    expect(result.output).toContain('modified');
    expect(result.output).toContain('\x1b[32m');
    expect(result.output).toContain('\x1b[31m');
  });

  it('shows inventory differences', () => {
    const store = new SourceStore(storeDir);
    store.write({
      instructions: null,
      mcpServers: [
        { name: 'source-only', description: '', install: null, requires_secret: false, source_tool: 'claude', sync: true },
      ],
      plugins: [], hooks: [], rules: [],
    });

    const result = runDiff(storeDir, homeDir);

    expect(result.hasDifferences).toBe(true);
    expect(result.output).toContain('source-only');
  });

  it('errors when source of truth does not exist', () => {
    const result = runDiff(join(storeDir, 'nonexistent'), homeDir);

    expect(result.output).toContain('scan');
    expect(result.hasDifferences).toBe(false);
  });
});

describe('runApply', () => {
  let storeDir: string;
  let homeDir: string;

  beforeEach(() => {
    storeDir = mkdtempSync(join(tmpdir(), 'skill-sync-apply-'));
    homeDir = mkdtempSync(join(tmpdir(), 'skill-sync-home-'));
  });

  afterEach(() => {
    rmSync(storeDir, { recursive: true, force: true });
    rmSync(homeDir, { recursive: true, force: true });
  });

  it('suggests scan when source of truth does not exist', () => {
    const result = runApply(join(storeDir, 'nonexistent'), homeDir, { dryRun: false, force: true });

    expect(result.output).toContain('scan');
    expect(result.exitCode).toBe(1);
  });

  it('reports up to date when no differences exist', () => {
    mkdirSync(join(homeDir, '.claude'), { recursive: true });
    writeFileSync(join(homeDir, '.claude', 'CLAUDE.md'), 'Same.');
    mkdirSync(join(homeDir, '.codex'), { recursive: true });
    writeFileSync(join(homeDir, '.codex', 'AGENTS.md'), 'Same.');

    const store = new SourceStore(storeDir);
    store.write({
      instructions: 'Same.',
      mcpServers: [], plugins: [], hooks: [], rules: [],
    });

    const result = runApply(storeDir, homeDir, { dryRun: false, force: true });

    expect(result.output).toContain('up to date');
    expect(result.exitCode).toBe(0);
  });

  it('dry-run shows planned actions without writing', () => {
    mkdirSync(join(homeDir, '.claude'), { recursive: true });
    writeFileSync(join(homeDir, '.claude', 'CLAUDE.md'), 'Old.');

    const store = new SourceStore(storeDir);
    store.write({
      instructions: 'New.',
      mcpServers: [], plugins: [], hooks: [], rules: [],
    });

    const result = runApply(storeDir, homeDir, { dryRun: true, force: false });

    expect(result.output).toContain('Dry run');
    expect(result.output).toContain('Would');
    expect(readFileSync(join(homeDir, '.claude', 'CLAUDE.md'), 'utf-8')).toBe('Old.');
    expect(result.exitCode).toBe(0);
  });

  it('force apply writes files and shows summary', () => {
    mkdirSync(join(homeDir, '.claude'), { recursive: true });
    writeFileSync(join(homeDir, '.claude', 'CLAUDE.md'), 'Old.');

    const store = new SourceStore(storeDir);
    store.write({
      instructions: 'New.',
      mcpServers: [
        { name: 'my-server', description: '', install: 'npx', requires_secret: true, source_tool: 'claude', sync: true },
      ],
      plugins: [], hooks: [], rules: [],
    });

    const result = runApply(storeDir, homeDir, { dryRun: false, force: true });

    expect(readFileSync(join(homeDir, '.claude', 'CLAUDE.md'), 'utf-8')).toBe('New.');
    expect(result.output).toContain('Written');
    expect(result.output).toContain('Backup');
    expect(result.output).toContain('my-server');
    expect(result.output).toContain('requires secret');
    expect(result.exitCode).toBe(0);
  });

  it('default mode returns needsConfirmation without writing', () => {
    mkdirSync(join(homeDir, '.claude'), { recursive: true });
    writeFileSync(join(homeDir, '.claude', 'CLAUDE.md'), 'Old.');

    const store = new SourceStore(storeDir);
    store.write({
      instructions: 'New.',
      mcpServers: [], plugins: [], hooks: [], rules: [],
    });

    const result = runApply(storeDir, homeDir, { dryRun: false, force: false });

    expect(result.needsConfirmation).toBe(true);
    expect(result.output).toContain('Would');
    expect(readFileSync(join(homeDir, '.claude', 'CLAUDE.md'), 'utf-8')).toBe('Old.');
  });
});
