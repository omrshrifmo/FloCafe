module.exports = {
  register: async ({ plugin, eventBus, registerApiRoute, registerUiRoute, logger }) => {
    logger.info(`[${plugin.id}] registering plugin routes`);
    registerUiRoute({ id: plugin.id, path: '/eg/settings', page: 'ui/SettingsPage.jsx' });
    registerApiRoute({
      method: 'GET',
      path: '/api/v1/eg/example',
      handler: 'api/example.js',
    });

    eventBus.on('order.created', (payload) => {
      logger.info(`[${plugin.id}] order.created ->`, payload?.order?.id ?? 'unknown');
    });
  },
};
