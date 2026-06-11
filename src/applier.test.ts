import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { apply } from './applier.js';
import type { SourceOfTruth, DiffResult } from './types.js';

function makeDiffResult(overrides: Partial<DiffResult> = {}): DiffResult {
  return {
    instructions: [],
    mcpServers: { missing: [], extra: [], matched: [] },
    plugins: { missing: [], extra: [], matched: [] },
    hooks: { missing: [], extra: [], matched: [] },
    rules: { missing: [], extra: [], matched: [] },
    hasDifferences: true,
    ...overrides,
  };
}

describe('apply', () => {
  let homeDir: string;
  let storeDir: string;

  beforeEach(() => {
    homeDir = mkdtempSync(join(tmpdir(), 'skill-sync-apply-home-'));
    storeDir = mkdtempSync(join(tmpdir(), 'skill-sync-apply-store-'));
  });

  afterEach(() => {
    rmSync(homeDir, { recursive: true, force: true });
    rmSync(storeDir, { recursive: true, force: true });
  });

  it('dry-run does not write any files', () => {
    mkdirSync(join(homeDir, '.claude'), { recursive: true });
    writeFileSync(join(homeDir, '.claude', 'CLAUDE.md'), 'Old.');

    const source: SourceOfTruth = {
      instructions: 'New content.',
      mcpServers: [], plugins: [], hooks: [], rules: [],
    };
    const diffResult = makeDiffResult({
      instructions: [
        { tool: 'claude', status: 'modified', patch: 'some patch' },
        { tool: 'codex', status: 'missing', patch: null },
      ],
    });

    const result = apply(source, diffResult, homeDir, storeDir, { dryRun: true, force: false });

    expect(readFileSync(join(homeDir, '.claude', 'CLAUDE.md'), 'utf-8')).toBe('Old.');
    expect(result.filesWritten).toHaveLength(0);
    expect(result.planned.length).toBeGreaterThan(0);
  });

  it('writes instructions to target files and creates backups', () => {
    mkdirSync(join(homeDir, '.claude'), { recursive: true });
    mkdirSync(join(homeDir, '.codex'), { recursive: true });
    writeFileSync(join(homeDir, '.claude', 'CLAUDE.md'), 'Old claude.');
    writeFileSync(join(homeDir, '.codex', 'AGENTS.md'), 'Old codex.');

    const source: SourceOfTruth = {
      instructions: 'New global content.',
      mcpServers: [], plugins: [], hooks: [], rules: [],
    };
    const diffResult = makeDiffResult({
      instructions: [
        { tool: 'claude', status: 'modified', patch: 'patch' },
        { tool: 'codex', status: 'modified', patch: 'patch' },
      ],
    });

    const result = apply(source, diffResult, homeDir, storeDir, { dryRun: false, force: true });

    expect(readFileSync(join(homeDir, '.claude', 'CLAUDE.md'), 'utf-8')).toBe('New global content.');
    expect(readFileSync(join(homeDir, '.codex', 'AGENTS.md'), 'utf-8')).toBe('New global content.');
    expect(result.filesWritten).toHaveLength(2);
    expect(result.backups).toHaveLength(2);
    expect(result.backups[0]).toContain('claude--CLAUDE.md');
  });

  it('lists inventory items needing manual setup with secret warnings', () => {
    const source: SourceOfTruth = {
      instructions: null,
      mcpServers: [
        { name: 'safe-server', description: '', install: 'npx', requires_secret: false, source_tool: 'claude', sync: true },
        { name: 'secret-server', description: '', install: 'npx', requires_secret: true, source_tool: 'codex', sync: true },
      ],
      plugins: [], hooks: [], rules: [],
    };
    const diffResult = makeDiffResult({
      mcpServers: {
        missing: source.mcpServers,
        extra: [],
        matched: [],
      },
    });

    const result = apply(source, diffResult, homeDir, storeDir, { dryRun: false, force: true });

    expect(result.manualSetup).toContain('MCP servers: safe-server');
    expect(result.manualSetup).toContain('MCP servers: secret-server [requires secret]');
  });

  it('warns and skips when target tool directory does not exist', () => {
    const source: SourceOfTruth = {
      instructions: 'Content.',
      mcpServers: [], plugins: [], hooks: [], rules: [],
    };
    const diffResult = makeDiffResult({
      instructions: [
        { tool: 'claude', status: 'modified', patch: 'patch' },
        { tool: 'codex', status: 'missing', patch: null },
      ],
    });

    const result = apply(source, diffResult, homeDir, storeDir, { dryRun: false, force: true });

    expect(result.filesWritten).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    expect(result.warnings.some(w => w.includes('claude'))).toBe(true);
  });
});
