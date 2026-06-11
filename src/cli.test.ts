import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const cli = resolve(import.meta.dirname, '..', 'dist', 'cli.js');

function run(...args: string[]) {
  try {
    return execFileSync('node', [cli, ...args], { encoding: 'utf-8', stdio: 'pipe' });
  } catch (e: any) {
    return e.stdout || e.message;
  }
}

describe('skill-sync CLI', () => {
  it('prints help with all four subcommands', () => {
    const output = run('--help');
    expect(output).toContain('init');
    expect(output).toContain('scan');
    expect(output).toContain('diff');
    expect(output).toContain('apply');
  });

  it('runs init without crashing', () => {
    const output = run('init');
    expect(output).toContain('Initialized');
  });

  it('runs scan without crashing', () => {
    const output = run('scan');
    expect(output).toContain('Scan complete');
  });

  it('runs diff without crashing', () => {
    const output = run('diff');
    expect(output.length).toBeGreaterThan(0);
  });

  it('runs apply with --force and --dry-run flags', () => {
    const output = run('apply', '--force', '--dry-run');
    expect(output.length).toBeGreaterThan(0);
  });
});
