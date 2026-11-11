const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const HttpError = require('../utils/HttpError');

const TOKEN_ISSUER = 'mern-blog-api';

async function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    throw new HttpError(401, 'Authentication required.');
  }

  let payload;
  try {
    payload = jwt.verify(match[1], process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: TOKEN_ISSUER,
    });
  } catch (_error) {
    throw new HttpError(401, 'Invalid or expired token.');
  }

  if (
    typeof payload === 'string'
    || typeof payload.sub !== 'string'
    || !mongoose.isValidObjectId(payload.sub)
  ) {
    throw new HttpError(401, 'Invalid or expired token.');
  }

  const userExists = await User.exists({ _id: payload.sub });
  if (!userExists) {
    throw new HttpError(401, 'Invalid or expired token.');
  }

  req.auth = { userId: payload.sub };
  next();
}

module.exports = { requireAuth, TOKEN_ISSUER };
