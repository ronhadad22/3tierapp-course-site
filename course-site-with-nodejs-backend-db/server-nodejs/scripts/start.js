const { resolveDatabaseUrl } = require('../utils/dbUrl');

async function start() {
  try {
    // Resolve DATABASE_URL (from env or AWS Secrets Manager)
    const url = await resolveDatabaseUrl({ allowExistingEnv: true });
    process.env.DATABASE_URL = url;
    console.log('DATABASE_URL resolved. Starting server...');
  } catch (err) {
    console.error('Failed to resolve DATABASE_URL before start:', err);
    process.exit(1);
  }

  // Import and run the main server (server.js also expects DATABASE_URL to be set)
  // eslint-disable-next-line global-require
  require('../server.js');
}

start().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
