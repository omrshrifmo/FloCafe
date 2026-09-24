module.exports = function({ app, eventBus, db }) {
  console.log('[Theme Egypt] Plugin Activated');

  app.get('/api/v1/theme-egypt/branding', (req, res) => {
    try {
      const branding = db.prepare('SELECT * FROM branding LIMIT 1').get();
      res.json(branding || {});
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Adding authorization requirements to updates
  app.put('/api/v1/theme-egypt/branding', (req, res, next) => {
      if (!req.user || !req.user.role || !['owner', 'manager'].includes(req.user.role)) {
          return res.status(403).json({ error: 'Unauthorized. Owner or Manager role required.' });
      }
      next();
  }, (req, res) => {
    try {
      const { app_name, logo_light, logo_dark, primary_color, secondary_color, locale_default } = req.body;
      db.prepare(`
        UPDATE branding
        SET app_name = ?, logo_light = ?, logo_dark = ?, primary_color = ?, secondary_color = ?, locale_default = ?, updated_at = ?
        WHERE id = (SELECT id FROM branding LIMIT 1)
      `).run(app_name, logo_light, logo_dark, primary_color, secondary_color, locale_default, new Date().toISOString());

      const branding = db.prepare('SELECT * FROM branding LIMIT 1').get();
      res.json(branding || {});
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
};
