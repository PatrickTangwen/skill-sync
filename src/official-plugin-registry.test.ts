import { describe, it, expect } from 'vitest';
import { isOfficial } from './official-plugin-registry.js';

describe('isOfficial', () => {
  it('returns true for Claude plugins from claude-plugins-official marketplace', () => {
    expect(isOfficial('feature-dev@claude-plugins-official', 'claude')).toBe(true);
    expect(isOfficial('context7@claude-plugins-official', 'claude')).toBe(true);
    expect(isOfficial('frontend-design@claude-plugins-official', 'claude')).toBe(true);
  });

  it('returns true for Claude plugins from anthropic-agent-skills marketplace', () => {
    expect(isOfficial('document-skills@anthropic-agent-skills', 'claude')).toBe(true);
  });

  it('returns false for non-official Claude plugins', () => {
    expect(isOfficial('claude-hud@claude-hud', 'claude')).toBe(false);
    expect(isOfficial('andrej-karpathy-skills@karpathy-skills', 'claude')).toBe(false);
  });

  it('returns true for Codex plugins from official marketplaces', () => {
    expect(isOfficial('github@openai-curated', 'codex')).toBe(true);
    expect(isOfficial('documents@openai-primary-runtime', 'codex')).toBe(true);
    expect(isOfficial('browser@openai-bundled', 'codex')).toBe(true);
    expect(isOfficial('chrome@openai-bundled', 'codex')).toBe(true);
  });

  it('returns false for non-official Codex plugins', () => {
    expect(isOfficial('some-custom@my-marketplace', 'codex')).toBe(false);
  });

  it('returns false for plugin ids without @ separator', () => {
    expect(isOfficial('no-marketplace', 'claude')).toBe(false);
  });

  it('returns false for unknown tool names', () => {
    expect(isOfficial('feature-dev@claude-plugins-official', 'cursor')).toBe(false);
  });
});
