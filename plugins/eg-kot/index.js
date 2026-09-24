module.exports = function({ app, eventBus, db }) {
  console.log('[EG KOT] Plugin Activated');

  const requireManager = (req, res, next) => {
    if (!req.user || !req.user.role || !['owner', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Unauthorized. Owner or Manager role required.' });
    }
    next();
  };

  app.get('/api/v1/eg-kot/stations', (req, res) => {
    try {
      const stations = db.prepare('SELECT * FROM kitchen_stations ORDER BY sort_order').all();
      res.json(stations);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/v1/eg-kot/stations', requireManager, (req, res) => {
    try {
      const { id, name, printer_id, enabled, sort_order } = req.body;
      db.prepare(`
        INSERT INTO kitchen_stations (id, name, printer_id, enabled, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, name, printer_id, enabled, sort_order);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/v1/eg-kot/stations/:id', requireManager, (req, res) => {
    try {
      const { name, printer_id, enabled, sort_order } = req.body;
      db.prepare(`
        UPDATE kitchen_stations SET name = ?, printer_id = ?, enabled = ?, sort_order = ? WHERE id = ?
      `).run(name, printer_id, enabled, sort_order, req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/v1/eg-kot/stations/:id', requireManager, (req, res) => {
    try {
      db.prepare('UPDATE kitchen_stations SET enabled = 0 WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/v1/eg-kot/slips', (req, res) => {
    try {
      const slips = db.prepare('SELECT * FROM kot_slips ORDER BY created_at DESC').all();
      res.json(slips);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/v1/eg-kot/slips/print', (req, res) => {
    try {
      const { order_id, station_id } = req.body;
      const slipsQuery = order_id ? 'SELECT * FROM kot_slips WHERE order_id = ? AND status = "pending"' : 'SELECT * FROM kot_slips WHERE status = "pending"';
      const slips = order_id ? db.prepare(slipsQuery).all(order_id) : db.prepare(slipsQuery).all();

      for (const slip of slips) {
         if (station_id && slip.station_id !== station_id) continue;

         const slipContent = JSON.parse(slip.content || '{}');

         db.prepare('UPDATE kot_slips SET status = "printed", printed = 1, printed_at = ? WHERE id = ?').run(new Date().toISOString(), slip.id);
         eventBus.emit('kot.slip_printed', { slip_id: slip.id });
      }

      res.json({ success: true, printed: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Hook into order events
  eventBus.on('order.created', (order) => {
     const items = order.items || db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
     const stationsMap = {};
     for (const item of items) {
        const targetStationId = (item.product_name && item.product_name.toLowerCase().includes('coffee')) ? 'barista' : 'chef';

        if (!stationsMap[targetStationId]) stationsMap[targetStationId] = [];
        stationsMap[targetStationId].push(item);
     }

     for (const stationId of Object.keys(stationsMap)) {
         const itemsForStation = stationsMap[stationId];
         if (itemsForStation.length > 0) {
             const contentJson = JSON.stringify({
                 stationName: stationId,
                 orderSummary: order,
                 items: itemsForStation
             });

             db.prepare(`
               INSERT INTO kot_slips (order_id, station_id, status, printed, content, created_at)
               VALUES (?, ?, ?, ?, ?, ?)
             `).run(order.id, stationId, 'pending', 0, contentJson, new Date().toISOString());

             eventBus.emit('kot.slip_created', { order_id: order.id, station_id: stationId });
         }
     }
  });
};
