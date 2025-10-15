const { resolveDatabaseUrl } = require('./utils/dbUrl');

const PORT = process.env.PORT ? Number(process.env.PORT) : 5001;

async function start() {
  // Resolve and set DATABASE_URL before loading the app/Prisma
  try {
    const url = await resolveDatabaseUrl({ allowExistingEnv: true });
    process.env.DATABASE_URL = url;
    console.log('DATABASE_URL resolved successfully.');
  } catch (e) {
    console.error('Failed to resolve DATABASE_URL:', e);
    process.exit(1);
  }

  // Load the app only after DATABASE_URL is set so Prisma initializes correctly
  // eslint-disable-next-line global-require
  const app = require('./app');
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

start();
