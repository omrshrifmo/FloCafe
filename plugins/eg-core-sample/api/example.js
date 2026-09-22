module.exports = async function exampleRoute(_req, res) {
  res.json({
    ok: true,
    plugin: 'eg-core-sample',
    message: 'Egypt Core sample plugin API endpoint is active.',
    timestamp: new Date().toISOString(),
  });
};
