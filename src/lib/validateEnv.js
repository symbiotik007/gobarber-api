const REQUIRED = [
  'APP_SECRET',
  'DB_HOST',
  'DB_USER',
  'DB_PASS',
  'DB_NAME',
];

export default function validateEnv() {
  const missing = REQUIRED.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(`[startup] Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}
