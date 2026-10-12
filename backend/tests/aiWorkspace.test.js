'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createAIWorkspaceRouter, validateFields, FIELD_KEYS } = require('../aiWorkspace.cjs');

const feature = {
  id: 'risk-review',
  title: 'Beneficiary risk review',
  description: 'Review beneficiary evidence and identify missing information.',
};

const completeFields = Object.fromEntries(FIELD_KEYS.map((key) => [key, `${key} example`]));

function createPool() {
  const rows = [];
  let nextId = 1;
  return {
    rows,
    async query(text, values = []) {
      const sql = text.replace(/\s+/g, ' ').trim();
      if (sql.startsWith('CREATE TABLE')) return { rows: [] };
      if (sql.startsWith('SELECT * FROM ai_workspace_runs')) {
        return { rows: rows.filter((row) => row.user_id === String(values[0]) && row.feature === values[1]).slice().reverse() };
      }
      if (sql.startsWith('SELECT id FROM ai_workspace_runs')) {
        return { rows: rows.filter((row) => String(row.id) === String(values[0]) && row.user_id === String(values[1]) && row.feature === values[2]).map(({ id }) => ({ id })) };
      }
      if (sql.startsWith('INSERT INTO ai_workspace_runs')) {
        const now = new Date().toISOString();
        const row = {
          id: nextId++, user_id: String(values[0]), feature: values[1], input: values[2], result: values[3],
          result_json: values[4], model: values[5], usage: values[6], created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row] };
      }
      if (sql.startsWith('UPDATE ai_workspace_runs')) {
        const row = rows.find((item) => item.user_id === String(values[0]) && item.feature === values[1] && String(item.id) === String(values[7]));
        if (!row) return { rows: [] };
        Object.assign(row, { input: values[2], result: values[3], result_json: values[4], model: values[5], usage: values[6], updated_at: new Date().toISOString() });
        return { rows: [row] };
      }
      if (sql.startsWith('DELETE FROM ai_workspace_runs')) {
        const index = rows.findIndex((row) => String(row.id) === String(values[0]) && row.user_id === String(values[1]));
        if (index < 0) return { rows: [] };
        const [deleted] = rows.splice(index, 1);
        return { rows: [{ id: deleted.id }] };
      }
      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
}

async function createServer({ fetchImpl, pool = createPool() }) {
  const app = express();
  app.use(express.json());
  app.use('/api/report-workspace', createAIWorkspaceRouter({
    pool,
    features: [feature],
    authenticateToken(req, _res, next) { req.user = { id: 7, tenantId: 'test-tenant' }; next(); },
    aiRateLimiter: (_req, _res, next) => next(),
    fetchImpl,
    env: { OPENROUTER_API_KEY: 'controlled-test-key', OPENROUTER_MODEL: 'test/model' },
  }));
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  return {
    pool,
    baseUrl: `http://127.0.0.1:${server.address().port}/api/report-workspace`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

function providerResponse(content = '# Summary\n\nEvidence reviewed.\n\n## Action plan\n\n- Confirm identity evidence.') {
  return new Response(JSON.stringify({
    model: 'test/model',
    usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 },
    choices: [{ message: { content } }],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

test('validateFields accepts every supported field and rejects unknown input', () => {
  const validated = validateFields(Object.fromEntries(FIELD_KEYS.map((key) => [key, `  ${key} value  `])));
  assert.deepEqual(Object.keys(validated), FIELD_KEYS);
  assert.equal(validated.context, 'context value');
  assert.throws(() => validateFields({ ...completeFields, unexpected: 'no' }), /invalid or too long/);
  assert.throws(() => validateFields({ ...completeFields, goal: '' }), /desired outcome/);
});

test('controlled OpenRouter reports are created, listed, updated, and deleted per actor', async (t) => {
  let providerCalls = 0;
  const runtime = await createServer({ fetchImpl: async () => { providerCalls += 1; return providerResponse(); } });
  t.after(runtime.close);
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer controlled-test-token' };

  const createdResponse = await fetch(`${runtime.baseUrl}/run`, {
    method: 'POST', headers, body: JSON.stringify({ feature: feature.id, fields: completeFields }),
  });
  assert.equal(createdResponse.status, 200);
  const created = (await createdResponse.json()).item;
  assert.equal(created.input.source_data, 'source_data example');
  assert.match(created.result, /Action plan/);
  assert.equal(created.usage.total_tokens, 25);

  const listed = await (await fetch(`${runtime.baseUrl}/runs?feature=${feature.id}`, { headers })).json();
  assert.equal(listed.items.length, 1);
  assert.equal(listed.items[0].user_id, 'tenant:test-tenant:user:7');

  const updatedResponse = await fetch(`${runtime.baseUrl}/run`, {
    method: 'POST', headers, body: JSON.stringify({ feature: feature.id, id: created.id, fields: { ...completeFields, goal: 'updated goal' } }),
  });
  assert.equal(updatedResponse.status, 200);
  assert.equal((await updatedResponse.json()).item.input.goal, 'updated goal');
  assert.equal(runtime.pool.rows.length, 1);

  const deletedResponse = await fetch(`${runtime.baseUrl}/runs/${created.id}`, { method: 'DELETE', headers });
  assert.equal(deletedResponse.status, 200);
  assert.deepEqual(await deletedResponse.json(), { deleted: true });
  assert.equal(runtime.pool.rows.length, 0);
  assert.equal(providerCalls, 2);
});

test('client cancellation aborts the controlled provider and persists no report', async (t) => {
  let providerStarted;
  const started = new Promise((resolve) => { providerStarted = resolve; });
  let providerAborted = false;
  const runtime = await createServer({ fetchImpl: (_url, options) => new Promise((_resolve, reject) => {
    providerStarted();
    options.signal.addEventListener('abort', () => {
      providerAborted = true;
      reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    }, { once: true });
  }) });
  t.after(runtime.close);

  const controller = new AbortController();
  const request = fetch(`${runtime.baseUrl}/run`, {
    method: 'POST', signal: controller.signal,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer controlled-test-token' },
    body: JSON.stringify({ feature: feature.id, fields: completeFields }),
  });
  await started;
  controller.abort();
  await assert.rejects(request, /abort/i);
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(providerAborted, true);
  assert.equal(runtime.pool.rows.length, 0);
});
