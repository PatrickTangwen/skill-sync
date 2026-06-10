const OFFICIAL_MARKETPLACES: Record<string, string[]> = {
  claude: ['claude-plugins-official', 'anthropic-agent-skills'],
  codex: ['openai-curated', 'openai-primary-runtime', 'openai-bundled'],
};

export function isOfficial(pluginId: string, tool: string): boolean {
  const atIndex = pluginId.lastIndexOf('@');
  if (atIndex === -1) return false;
  const marketplace = pluginId.slice(atIndex + 1);
  const officialList = OFFICIAL_MARKETPLACES[tool];
  if (!officialList) return false;
  return officialList.includes(marketplace);
}
