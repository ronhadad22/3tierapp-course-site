#!/usr/bin/env node
/*
  Resolve DATABASE_URL for Prisma CLI by reading AWS Secrets Manager.
  Supports two secret shapes:
   1) Full connection string as plain text (e.g., mysql://user:pass@host:3306/db?params)
   2) JSON with { user, password } and the host/db/port/params provided via environment

  Required env when using JSON secret:
   - DB_HOST
   - DB_NAME
  Optional env:
   - DB_PORT (default 3306)
   - DB_PARAMS (e.g., sslmode=REQUIRED)
   - AWS_REGION or AWS_DEFAULT_REGION (default eu-central-1)
   - DB_USERPASS_SECRET_ARN or DB_CONNECTION_STRING_SECRET_ARN
*/
const { spawn } = require('node:child_process');
const { resolveDatabaseUrl } = require('../utils/dbUrl');

(async () => {
  try {
    const resolved = await resolveDatabaseUrl({ allowExistingEnv: true });
    process.env.DATABASE_URL = resolved;

    const args = process.argv.slice(2);
    if (args.length === 0) {
      console.error('Usage: node scripts/prisma-env.js prisma <args...>');
      process.exit(2);
    }

    const child = spawn(args[0], args.slice(1), { stdio: 'inherit', env: process.env, shell: true });
    child.on('exit', (code) => process.exit(code));
    child.on('error', (err) => { console.error(err); process.exit(1); });
  } catch (e) {
    console.error('Failed to resolve DATABASE_URL for Prisma:', e.message || e);
    process.exit(1);
  }
})();
