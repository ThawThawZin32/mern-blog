const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth, TOKEN_ISSUER } = require('../middleware/authMiddleware');
const HttpError = require('../utils/HttpError');

const router = express.Router();

function validateEmail(email) {
  return typeof email === 'string'
    && email.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function createToken(userId) {
  return jwt.sign(
    { sub: String(userId) },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: TOKEN_ISSUER,
    },
  );
}

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) {
    throw new HttpError(400, 'Name is required and must be 80 characters or fewer.');
  }
  if (!validateEmail(email)) {
    throw new HttpError(400, 'A valid email address is required.');
  }
  if (
    typeof password !== 'string'
    || password.length < 8
    || Buffer.byteLength(password, 'utf8') > 72
  ) {
    throw new HttpError(400, 'Password must be at least 8 characters and no more than 72 bytes.');
  }

  const user = await User.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
  });

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
      },
      token: createToken(user._id),
    },
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!validateEmail(email) || typeof password !== 'string') {
    throw new HttpError(400, 'A valid email and password are required.');
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new HttpError(401, 'Email or password is incorrect.');
  }

  res.json({
    success: true,
    data: {
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
      },
      token: createToken(user._id),
    },
  });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.auth.userId).select('name email createdAt');
  if (!user) {
    throw new HttpError(404, 'User not found.');
  }

  res.json({ success: true, data: { user } });
});

module.exports = router;
