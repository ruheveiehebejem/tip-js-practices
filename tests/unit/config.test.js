import assert from 'node:assert/strict';
import test from 'node:test';
import { readConfig } from '../../src/config.js';

test('readConfig читает полную корректную конфигурацию', () => {
  const config = readConfig({
    API_PORT: '5513',
    DATABASE_URL: 'postgresql://user:password@127.0.0.1:5432/test',
    ENABLE_DEBUG_RESET: 'true',
  });
  assert.deepEqual(config, {
    port: 5513,
    connectionString: 'postgresql://user:password@127.0.0.1:5432/test',
    enableDebugReset: true,
  });
});

test('readConfig использует безопасные значения по умолчанию', () => {
  const config = readConfig({ DATABASE_URL: 'postgresql://example' });
  assert.equal(config.port, 5505);
  assert.equal(config.enableDebugReset, false);
});

