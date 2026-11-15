const mongoose = require('mongoose');
const HttpError = require('../utils/HttpError');

function notFound(req, res, next) {
  next(new HttpError(404, `Route not found: ${req.method} ${req.path}`));
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let status = error.status || error.statusCode || 500;
  let message = error.message || 'Internal server error.';

  if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
    status = 400;
    message = error.message;
  } else if (error.code === 11000) {
    status = 409;
    message = 'A user with this email or username already exists.';
  } else if (error.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body contains invalid JSON.';
  } else if (status >= 500) {
    message = 'Internal server error.';
    console.error('API error:', error);
  }

  res.status(status).json({
    success: false,
    message,
  });
}

module.exports = { notFound, errorHandler };
