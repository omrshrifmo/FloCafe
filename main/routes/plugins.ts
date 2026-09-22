import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import { requireRole } from '../middleware/security';
import { ROLE_ACCESS } from '../../shared/role-permissions';
import { pluginsService } from '../services/PluginsService';

const router = Router();

router.get('/', requireRole(...ROLE_ACCESS.ownerManager), asyncHandler(async (_req: Request, res: Response) => {
  res.json({ plugins: pluginsService.listPlugins(), uiRoutes: pluginsService.listUiRoutes() });
}));

router.get('/ui', requireRole(...ROLE_ACCESS.ownerManager), asyncHandler(async (_req: Request, res: Response) => {
  res.json({ routes: pluginsService.listUiRoutes() });
}));

router.post('/:id/enable', requireRole(...ROLE_ACCESS.ownerManager), asyncHandler(async (req: Request, res: Response) => {
  const pluginId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await pluginsService.enablePlugin(pluginId);
  if (!result.success) {
    return res.status(404).json({ error: result.error || 'Plugin not found' });
  }
  return res.json({ success: true, plugin: result.plugin });
}));

router.post('/:id/disable', requireRole(...ROLE_ACCESS.ownerManager), asyncHandler(async (req: Request, res: Response) => {
  const pluginId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await pluginsService.disablePlugin(pluginId);
  if (!result.success) {
    return res.status(404).json({ error: result.error || 'Plugin not found' });
  }
  return res.json({ success: true, plugin: result.plugin });
}));

router.get('/:id/settings', requireRole(...ROLE_ACCESS.ownerManager), asyncHandler(async (req: Request, res: Response) => {
  const pluginId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const plugin = pluginsService.getPlugin(pluginId);
  if (!plugin) {
    return res.status(404).json({ error: 'Plugin not found' });
  }
  return res.json({ pluginId: plugin.id, settings: plugin.settings ?? {}, settingsSchema: plugin.settingsSchema ?? { type: 'object', properties: {} } });
}));

router.put('/:id/settings', requireRole(...ROLE_ACCESS.ownerManager), asyncHandler(async (req: Request, res: Response) => {
  const pluginId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const payload = req.body && typeof req.body === 'object' && 'settings' in req.body ? req.body.settings : req.body;
  const result = pluginsService.updatePluginSettings(pluginId, payload);
  if (!result.success) {
    return res.status(404).json({ error: result.error || 'Plugin not found' });
  }
  return res.json({ success: true, pluginId, settings: result.settings ?? {} });
}));

export { router as pluginRoutes };
