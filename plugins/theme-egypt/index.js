function register(runtime) {
  return {
    id: 'theme-egypt',
    kind: 'theme',
    ready: true,
    runtime,
  };
}

module.exports = { register };
module.exports.default = register;
