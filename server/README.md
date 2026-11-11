# Blog API

This is an original Express and MongoDB API with JWT authentication and local cover-image uploads.

## Setup

1. Copy `.env.example` to `.env` and set `MONGO_URI` and a private random `JWT_SECRET` of at least 32 bytes.
2. Start MongoDB.
3. From this directory, run `npm install`, then `npm run dev` (or `npm start`).
4. The API listens on port `5000` by default. Check `GET /api/health`.

Never commit `.env` or expose your JWT secret.

## Authentication

- `POST /api/users/register` — JSON `{ "name": "...", "email": "...", "password": "..." }`
- `POST /api/users/login` — JSON `{ "email": "...", "password": "..." }`
- `GET /api/users/me` — requires `Authorization: Bearer <token>`

Passwords must be at least 8 characters. Successful register/login responses include a JWT in `data.token`.

## Posts

- `GET /api/posts?page=1&limit=10&search=term&tag=tag` — public, paginated list; `limit` is capped at 50
- `GET /api/posts/:id` — public post details
- `GET /api/posts/mine` — authenticated user's posts
- `POST /api/posts` — authenticated; JSON or multipart form fields `title`, `content`, optional comma-separated `tags`, optional `coverImage`
- `PATCH /api/posts/:id` — authenticated owner; update any post fields and/or `coverImage`
- `DELETE /api/posts/:id` — authenticated owner

For create, `title` must be 3–160 characters and `content` is required. Cover images accept JPEG, PNG, or WebP up to 5 MB. Uploads use the `coverImage` field and are served from `/uploads/<generated-filename>`.

API responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "message": "..." }`.

Run `npm test` for API smoke tests.
