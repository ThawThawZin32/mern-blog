const crypto = require('crypto');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const fileUpload = require('express-fileupload');
const HttpError = require('./HttpError');

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const UPLOAD_DIRECTORY = path.join(__dirname, '..', 'uploads');

const uploadImage = fileUpload({
  useTempFiles: true,
  tempFileDir: path.join(os.tmpdir(), 'mern-blog-temp'),
  limits: {
    files: 1,
    fileSize: MAX_IMAGE_SIZE,
    fields: 20,
  },
  abortOnLimit: false,
  parseNested: false,
});

const allowedImages = {
  '.jpg': { mime: 'image/jpeg', matches: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  '.jpeg': { mime: 'image/jpeg', matches: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  '.png': { mime: 'image/png', matches: (bytes) => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  '.webp': { mime: 'image/webp', matches: (bytes) => bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' },
};

function getUploadedImage(req) {
  if (!req.files) {
    return null;
  }

  const fields = Object.keys(req.files);
  if (fields.length !== 1 || fields[0] !== 'coverImage') {
    throw new HttpError(400, 'Upload the image using the "coverImage" field only.');
  }

  const image = req.files.coverImage;
  if (Array.isArray(image)) {
    throw new HttpError(400, 'Upload only one cover image.');
  }
  if (image.truncated) {
    throw new HttpError(413, 'Image must be 5 MB or smaller.');
  }
  return image;
}

async function readFileHeader(file) {
  if (file.tempFilePath) {
    const handle = await fs.open(file.tempFilePath, 'r');
    try {
      const header = Buffer.alloc(12);
      const { bytesRead } = await handle.read(header, 0, header.length, 0);
      return header.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  }

  return file.data.subarray(0, 12);
}

async function saveCoverImage(file) {
  const extension = path.extname(file.name).toLowerCase();
  const imageType = allowedImages[extension];
  if (!imageType || file.mimetype !== imageType.mime) {
    throw new HttpError(415, 'Only JPEG, PNG, and WebP images are allowed.');
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new HttpError(413, 'Image must be 5 MB or smaller.');
  }

  const header = await readFileHeader(file);
  if (!imageType.matches(header)) {
    throw new HttpError(415, 'The uploaded file is not a valid image.');
  }

  await fs.mkdir(UPLOAD_DIRECTORY, { recursive: true });
  const filename = `${crypto.randomUUID()}${extension}`;
  const destination = path.join(UPLOAD_DIRECTORY, filename);
  await file.mv(destination);
  return `/uploads/${filename}`;
}

async function deleteCoverImage(imagePath) {
  if (typeof imagePath !== 'string' || !imagePath.startsWith('/uploads/')) {
    return;
  }

  const filename = imagePath.slice('/uploads/'.length);
  if (!filename || path.basename(filename) !== filename) {
    return;
  }

  try {
    await fs.unlink(path.join(UPLOAD_DIRECTORY, filename));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function removeCoverImageSafely(imagePath) {
  try {
    await deleteCoverImage(imagePath);
  } catch (error) {
    console.error('Could not remove uploaded image:', error);
  }
}

module.exports = {
  deleteCoverImage,
  getUploadedImage,
  removeCoverImageSafely,
  saveCoverImage,
  uploadImage,
};
