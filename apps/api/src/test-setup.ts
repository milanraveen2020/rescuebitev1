import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Jest setup: load apps/api/.env into process.env (without overriding values
 * already set) so integration tests can reach the local database. Unit tests
 * are unaffected.
 */
try {
  const contents = readFileSync(join(__dirname, '..', '.env'), 'utf8');
  for (const line of contents.split('\n')) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match && match[1] && !(match[1] in process.env)) {
      process.env[match[1]] = match[2];
    }
  }
} catch {
  // No .env file — rely on ambient environment (e.g. CI).
}
