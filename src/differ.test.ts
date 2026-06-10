import { describe, it, expect } from 'vitest';
import { diff } from './differ.js';
import type { SourceOfTruth, MachineState } from './types.js';

describe('diff', () => {
  it('reports identical when instructions match on both tools', () => {
    const source: SourceOfTruth = {
      instructions: 'Use first-principles thinking.',
      mcpServers: [], plugins: [], hooks: [], rules: [],
    };
    const machine: MachineState = {
      instructions: {
        claude: { found: true, content: 'Use first-principles thinking.', path: '/home/.claude/CLAUDE.md' },
        codex: { found: true, content: 'Use first-principles thinking.', path: '/home/.codex/AGENTS.md' },
      },
      mcpServers: [], plugins: [], hooks: [], rules: [],
    };

    const result = diff(source, machine);

    expect(result.instructions).toHaveLength(2);
    expect(result.instructions.find(d => d.tool === 'claude')!.status).toBe('identical');
    expect(result.instructions.find(d => d.tool === 'codex')!.status).toBe('identical');
    expect(result.hasDifferences).toBe(false);
  });

  it('reports modified with unified diff when instructions differ', () => {
    const source: SourceOfTruth = {
      instructions: 'Line one.\nLine two.\nLine three.',
      mcpServers: [], plugins: [], hooks: [], rules: [],
    };
    const machine: MachineState = {
      instructions: {
        claude: { found: true, content: 'Line one.\nChanged line.\nLine three.', path: '/home/.claude/CLAUDE.md' },
        codex: { found: true, content: 'Line one.\nLine two.\nLine three.', path: '/home/.codex/AGENTS.md' },
      },
      mcpServers: [], plugins: [], hooks: [], rules: [],
    };

    const result = diff(source, machine);
    const claudeDiff = result.instructions.find(d => d.tool === 'claude')!;

    expect(claudeDiff.status).toBe('modified');
    expect(claudeDiff.patch).toContain('-Changed line.');
    expect(claudeDiff.patch).toContain('+Line two.');
    expect(result.instructions.find(d => d.tool === 'codex')!.status).toBe('identical');
    expect(result.hasDifferences).toBe(true);
  });

  it('reports missing when target instruction file does not exist', () => {
    const source: SourceOfTruth = {
      instructions: 'Some content.',
      mcpServers: [], plugins: [], hooks: [], rules: [],
    };
    const machine: MachineState = {
      instructions: {
        claude: { found: false, content: null, path: '/home/.claude/CLAUDE.md' },
        codex: { found: true, content: 'Some content.', path: '/home/.codex/AGENTS.md' },
      },
      mcpServers: [], plugins: [], hooks: [], rules: [],
    };

    const result = diff(source, machine);

    expect(result.instructions.find(d => d.tool === 'claude')!.status).toBe('missing');
    expect(result.instructions.find(d => d.tool === 'codex')!.status).toBe('identical');
    expect(result.hasDifferences).toBe(true);
  });

  it('reports source_missing when no global.md exists', () => {
    const source: SourceOfTruth = {
      instructions: null,
      mcpServers: [], plugins: [], hooks: [], rules: [],
    };
    const machine: MachineState = {
      instructions: {
        claude: { found: true, content: 'Existing.', path: '/home/.claude/CLAUDE.md' },
        codex: { found: false, content: null, path: '/home/.codex/AGENTS.md' },
      },
      mcpServers: [], plugins: [], hooks: [], rules: [],
    };

    const result = diff(source, machine);

    expect(result.instructions.find(d => d.tool === 'claude')!.status).toBe('source_missing');
    expect(result.instructions.find(d => d.tool === 'codex')!.status).toBe('source_missing');
    expect(result.hasDifferences).toBe(false);
  });

  it('detects inventory items missing from machine and extra on machine', () => {
    const source: SourceOfTruth = {
      instructions: null,
      mcpServers: [
        { name: 'server-a', description: '', install: null, requires_secret: false, source_tool: 'claude', sync: true },
        { name: 'server-b', description: '', install: null, requires_secret: false, source_tool: 'codex', sync: true },
      ],
      plugins: [],
      hooks: [
        { name: 'PreToolUse', description: '', trigger: 'PreToolUse', target_tool: 'claude', sync: true },
      ],
      rules: [],
    };
    const machine: MachineState = {
      instructions: {
        claude: { found: false, content: null, path: '' },
        codex: { found: false, content: null, path: '' },
      },
      mcpServers: [
        { name: 'server-b', description: '', install: null, requires_secret: false, source_tool: 'codex', sync: true },
        { name: 'server-c', description: '', install: null, requires_secret: false, source_tool: 'claude', sync: true },
      ],
      plugins: [],
      hooks: [],
      rules: [],
    };

    const result = diff(source, machine);

    expect(result.mcpServers.missing.map(s => s.name)).toEqual(['server-a']);
    expect(result.mcpServers.extra.map(s => s.name)).toEqual(['server-c']);
    expect(result.mcpServers.matched.map(s => s.name)).toEqual(['server-b']);
    expect(result.hooks.missing.map(h => h.name)).toEqual(['PreToolUse']);
    expect(result.hasDifferences).toBe(true);
  });

  it('excludes sync: false items from inventory diff', () => {
    const source: SourceOfTruth = {
      instructions: null,
      mcpServers: [
        { name: 'synced', description: '', install: null, requires_secret: false, source_tool: 'claude', sync: true },
        { name: 'excluded', description: '', install: null, requires_secret: false, source_tool: 'claude', sync: false },
      ],
      plugins: [], hooks: [], rules: [],
    };
    const machine: MachineState = {
      instructions: {
        claude: { found: false, content: null, path: '' },
        codex: { found: false, content: null, path: '' },
      },
      mcpServers: [],
      plugins: [], hooks: [], rules: [],
    };

    const result = diff(source, machine);

    expect(result.mcpServers.missing.map(s => s.name)).toEqual(['synced']);
    expect(result.mcpServers.missing.map(s => s.name)).not.toContain('excluded');
  });
});
