try {
  const serverOnlyId = require.resolve('server-only');
  require.cache[serverOnlyId] = {
    id: serverOnlyId,
    filename: serverOnlyId,
    loaded: true,
    exports: {},
  };
} catch {
  // Ignore environments where `server-only` is absent.
}
