const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const app = require('../app');
const User = require('../models/User');

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

test('user model exposes username and avatar without serializing passwords', () => {
  const user = new User({
    name: 'New Writer',
    username: 'new-writer',
    email: 'new@example.com',
    password: 'password123',
    profilePicture: '/uploads/avatar.png',
  });

  assert.equal(user.username, 'new-writer');
  assert.equal(user.avatar, '/uploads/avatar.png');
  const serializedUser = user.toJSON();
  assert.equal(serializedUser.avatar, '/uploads/avatar.png');
  assert.equal('password' in serializedUser, false);
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

test('public user profile rejects malformed IDs before querying the database', async () => {
  const response = await fetch(`${baseUrl}/api/users/not-an-id`);
  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /Invalid user ID/);
});

test('registration validates input before accessing the database', async () => {
  const response = await fetch(`${baseUrl}/api/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /Name or username is required/);
});

test('username-only registration validates avatar images', async () => {
  const formData = new FormData();
  formData.append('username', 'new-writer');
  formData.append('password', 'password123');
  formData.append('avatar', new Blob(['not a png'], { type: 'image/png' }), 'avatar.png');

  const response = await fetch(`${baseUrl}/api/register`, {
    method: 'POST',
    body: formData,
  });
  assert.equal(response.status, 415);
  assert.match((await response.json()).message, /not a valid image/);
});

test('root login alias validates required credentials', async () => {
  const response = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /valid email or username and password/);
});

test('avatar upload requires authentication', async () => {
  const response = await fetch(`${baseUrl}/api/upload`, { method: 'POST' });
  assert.equal(response.status, 401);
});

test('registration validates uploaded profile pictures before accessing the database', async () => {
  const formData = new FormData();
  formData.append('name', 'New Writer');
  formData.append('email', 'new@example.com');
  formData.append('password', 'password123');
  formData.append(
    'profilePicture',
    new Blob(['not a png'], { type: 'image/png' }),
    'profile.png',
  );

  const response = await fetch(`${baseUrl}/api/users/register`, {
    method: 'POST',
    body: formData,
  });
  assert.equal(response.status, 415);
  assert.match((await response.json()).message, /not a valid image/);
});

test('post creation requires authentication', async () => {
  const response = await fetch(`${baseUrl}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'A sample title', content: 'A sample post.' }),
  });
  assert.equal(response.status, 401);
});

test('post update supports PUT and requires authentication', async () => {
  const response = await fetch(`${baseUrl}/api/posts/507f1f77bcf86cd799439011`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Updated title' }),
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

test('post list rejects unsupported categories before querying the database', async () => {
  const response = await fetch(`${baseUrl}/api/posts?category=not-a-category`);
  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /Invalid post category/);
});

test('unknown API routes return a JSON 404', async () => {
  const response = await fetch(`${baseUrl}/api/missing`);
  assert.equal(response.status, 404);
  assert.equal((await response.json()).success, false);
});
