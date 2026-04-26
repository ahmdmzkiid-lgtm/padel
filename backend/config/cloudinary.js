import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { Readable } from 'stream';

// ── Konfigurasi Cloudinary ────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Tipe file yang diizinkan ──────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// ── File filter ───────────────────────────────────────────────────────────────
const imageFileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    return cb(new Error('Format file tidak didukung. Hanya JPG, PNG, dan WEBP yang diizinkan.'), false);
  }
  cb(null, true);
};

// ── Multer pakai memory storage (tidak simpan ke disk) ────────────────────────
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

// ── Helper: upload buffer ke Cloudinary ──────────────────────────────────────
const uploadToCloudinary = (buffer, folder, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, ...options },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

// ── Middleware factory ────────────────────────────────────────────────────────
// fieldName: nama field di form, folder: folder di Cloudinary
export const createUploadMiddleware = (fieldName, folder, options = {}) => {
  return async (req, res, next) => {
    memoryUpload.single(fieldName)(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'Ukuran file terlalu besar. Maksimal 5 MB.' });
        }
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      }
      if (err) {
        return res.status(400).json({ message: err.message });
      }

      if (!req.file) return next();

      try {
        const result = await uploadToCloudinary(req.file.buffer, folder, {
          transformation: options.transformation || [{ quality: 'auto', fetch_format: 'auto' }],
        });

        // Simpan URL Cloudinary di req.file.path — dipakai controller
        req.file.path = result.secure_url;
        req.file.cloudinary_public_id = result.public_id;

        next();
      } catch (uploadErr) {
        console.error('Cloudinary upload error:', uploadErr);
        res.status(500).json({ message: 'Gagal mengunggah gambar. Silakan coba lagi.' });
      }
    });
  };
};

// ── Helper: hapus file dari Cloudinary ───────────────────────────────────────
export const deleteFromCloudinary = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) return;
  try {
    const parts = imageUrl.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return;
    const pathParts = parts.slice(uploadIndex + 1);
    if (pathParts[0].startsWith('v')) pathParts.shift();
    const publicId = pathParts.join('/').replace(/\.[^/.]+$/, '');
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary delete error:', err);
  }
};

export { cloudinary };
