// Shared utility to resolve Prisma DATABASE_URL from AWS Secrets Manager or env
// Supports two secret shapes:
//  1) Full connection string as plain text (mysql://...)
//  2) JSON { user, password } combined with env: DB_HOST, DB_NAME, optional DB_PORT, DB_PARAMS

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

function buildMysqlUrl({ user, password, host, port, db, params }) {
  const encUser = encodeURIComponent(user);
  const encPass = encodeURIComponent(password);
  const base = `mysql://${encUser}:${encPass}@${host}:${port}/${db}`;
  return params && String(params).trim() ? `${base}?${params}` : base;
}

async function fetchSecretString(secretArn, region) {
  const client = new SecretsManagerClient({ region });
  const resp = await client.send(new GetSecretValueCommand({ SecretId: secretArn }));
  return resp.SecretString || (resp.SecretBinary ? Buffer.from(resp.SecretBinary, 'base64').toString('utf-8') : null);
}

async function resolveDatabaseUrl({ allowExistingEnv = true } = {}) {
  if (allowExistingEnv && process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
    return process.env.DATABASE_URL.trim();
  }

  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu-central-1';
  const fullArn = process.env.DB_CONNECTION_STRING_SECRET_ARN;
  const userPassArn = process.env.DB_USERPASS_SECRET_ARN || process.env.DB_CONNECTION_STRING_SECRET_ARN;

  // Try full connection string first if provided
  if (fullArn) {
    const secret = await fetchSecretString(fullArn, region);
    if (!secret) throw new Error('Secret (connection string) had no content');
    const trimmed = secret.trim();
    if (trimmed.startsWith('mysql://')) return trimmed;
    // Fall through if not a URL
  }

  if (!userPassArn) {
    throw new Error('No secret ARN provided. Set DB_CONNECTION_STRING_SECRET_ARN (full URL) or DB_USERPASS_SECRET_ARN (user/password JSON).');
  }

  const secretStr = await fetchSecretString(userPassArn, region);
  if (!secretStr) throw new Error('Secret (user/password) had no content');

  const trimmed = secretStr.trim();
  if (trimmed.startsWith('mysql://')) return trimmed; // allow full URL in either secret

  // parse JSON { user, password } or AWS RDS format { username, password, host, port, dbname, engine }
  let parsed;
  try { parsed = JSON.parse(trimmed); } catch (e) {
    throw new Error('Secret is not a URL and not valid JSON. Expected mysql://... OR JSON with credentials.');
  }

  // If secret contains a URL field, accept it directly
  const urlField = parsed.DATABASE_URL || parsed.database_url || parsed.url || parsed.connectionString || parsed.connection_string;
  if (typeof urlField === 'string' && urlField.trim().startsWith('mysql://')) {
    return urlField.trim();
  }

  const user = parsed.user || parsed.username || parsed.dbUser || parsed.DB_USER;
  const password = parsed.password || parsed.dbPassword || parsed.DB_PASSWORD;
  if (!user || !password) throw new Error('Secret JSON missing user/password (expected keys like user/username and password).');

  // host/db/port can come from env (preferred) or secret (AWS RDS secret has host, port, dbname)
  const host = process.env.DB_HOST || parsed.host || parsed.hostname;
  const db = process.env.DB_NAME || parsed.db || parsed.database || parsed.dbname || parsed.DB_NAME;
  const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : (parsed.port ? Number(parsed.port) : 3306);
  const params = process.env.DB_PARAMS || parsed.params || '';
  if (!host || !db) throw new Error('DB host/name not provided. Set DB_HOST and DB_NAME env or include host/dbname in the secret.');

  return buildMysqlUrl({ user, password, host, port, db, params });
}

module.exports = {
  buildMysqlUrl,
  resolveDatabaseUrl,
};
