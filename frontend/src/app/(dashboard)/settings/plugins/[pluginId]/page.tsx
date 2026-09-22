import fs from 'node:fs';
import path from 'node:path';
import { PluginSettingsForm } from '@/components/settings/PluginSettingsForm';

export function generateStaticParams() {
  const pluginRoot = path.resolve(process.cwd(), '..', 'plugins');
  if (!fs.existsSync(pluginRoot)) return [];

  const pluginIds = fs.readdirSync(pluginRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((entry) => fs.existsSync(path.join(pluginRoot, entry, 'plugin.json')))
    .sort();

  return pluginIds.map((pluginId) => ({ pluginId }));
}

export default async function PluginSettingsPage({
  params,
}: {
  params: Promise<{ pluginId: string }>;
}) {
  const resolvedParams = await params;
  const pluginId = decodeURIComponent(resolvedParams.pluginId ?? '');
  return <PluginSettingsForm pluginId={pluginId} />;
}
