const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const app = require('../app');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('health endpoint returns a successful status', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    data: { status: 'ok' },
  });
});

test('user profile requires a bearer token', async () => {
  const response = await fetch(`${baseUrl}/api/users/me`);
  assert.equal(response.status, 401);
  assert.equal((await response.json()).success, false);
});

test('registration validates input before accessing the database', async () => {
  const response = await fetch(`${baseUrl}/api/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /Name is required/);
});

test('post creation requires authentication', async () => {
  const response = await fetch(`${baseUrl}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'A sample title', content: 'A sample post.' }),
  });
  assert.equal(response.status, 401);
});

test('post routes reject malformed IDs before querying the database', async () => {
  const response = await fetch(`${baseUrl}/api/posts/not-an-id`);
  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /Invalid post ID/);
});

test('post list validates pagination before querying the database', async () => {
  const response = await fetch(`${baseUrl}/api/posts?page=0`);
  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /Page must be positive/);
});

test('unknown API routes return a JSON 404', async () => {
  const response = await fetch(`${baseUrl}/api/missing`);
  assert.equal(response.status, 404);
  assert.equal((await response.json()).success, false);
});
