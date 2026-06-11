import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const skillPath = resolve(import.meta.dirname, '..', 'skill', 'SKILL.md');

describe('skill-sync Claude Code skill', () => {
  const content = readFileSync(skillPath, 'utf-8');

  it('has required metadata and trigger descriptions', () => {
    expect(content).toContain('# skill-sync');
    expect(content).toContain('/skill-sync');
    expect(content).toContain('scan');
    expect(content).toContain('diff');
    expect(content).toContain('apply');
  });

  it('instructs to check CLI installation', () => {
    expect(content).toContain('npm');
    expect(content).toContain('skill-sync');
  });

  it('instructs to guide user on requires_secret items', () => {
    expect(content).toContain('requires_secret');
  });
});
