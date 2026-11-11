const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const app = require('./app');

// Environment variables
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGO_URI) {
  console.error('MONGO_URI is missing. Add it to server/.env before starting the server.');
  process.exit(1);
}
if (
  !JWT_SECRET
  || Buffer.byteLength(JWT_SECRET, 'utf8') < 32
  || JWT_SECRET.toLowerCase().includes('replace-with')
) {
  console.error('JWT_SECRET is missing or too short. Set a secret of at least 32 bytes in server/.env.');
  process.exit(1);
}

// MongoDB Connection
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected Successfully');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database connection failed:', error.message);
    process.exitCode = 1;
  });