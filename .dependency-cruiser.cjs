// .dependency-cruiser.js
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    { name: 'no-orphans', severity: 'warn', from: { orphan: true }, to: {} },
    {
      name: 'no-cross-layer',
      severity: 'error',
      from: { path: '^src/ui' },
      to: { path: '^src/core' },
    },
  ],
  options: {
    reporterOptions: { dot: { collapsePattern: 'node_modules' } },
  },
};
