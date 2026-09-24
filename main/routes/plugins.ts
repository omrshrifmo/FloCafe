import { Router } from 'express';
import { requireRole } from '../middleware/security';
import { pluginsService } from '../services/plugins';

const router = Router();

// Authentication is applied globally to /api/* in server.ts
// Only Owner and Manager can manage plugins
router.use(requireRole('owner', 'manager'));

router.get('/', (req, res) => {
  try {
    const plugins = pluginsService.listPlugins();
    // Attach manifest data to the DB response
    const richPlugins = plugins.map((p: any) => ({
      ...p,
      manifest: pluginsService.getPluginMetadata(p.id)
    }));
    res.json(richPlugins);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/enable', (req, res) => {
  try {
    pluginsService.enablePlugin(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/disable', (req, res) => {
  try {
    pluginsService.disablePlugin(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/settings', (req, res) => {
  try {
    const settings = pluginsService.getSettings(req.params.id);
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/settings', (req, res) => {
  try {
    pluginsService.updateSettings(req.params.id, req.body);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ui/registry', (req, res) => {
  try {
    const plugins = pluginsService.listPlugins();
    const uiRoutes: any[] = [];
    for (const p of plugins) {
       if (p.enabled === 1) {
         const manifest = pluginsService.getPluginMetadata(p.id);
         if (manifest && manifest.routes && manifest.routes.ui) {
            for (const r of manifest.routes.ui) {
               uiRoutes.push({ pluginId: p.id, path: r.path, page: r.page });
            }
         }
       }
    }
    res.json(uiRoutes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
