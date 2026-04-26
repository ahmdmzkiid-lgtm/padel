import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// ── Konfigurasi Cloudinary ────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Tipe file yang diizinkan ──────────────────────────────────────────────────
const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// ── File filter: cek MIME type sebelum upload ke Cloudinary ──────────────────
const imageFileFilter = (req, file, cb) => {
  const mime = file.mimetype.toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    return cb(new Error('Format file tidak didukung. Hanya JPG, PNG, dan WEBP yang diizinkan.'), false);
  }
  cb(null, true);
};

// ── Storage: Payment Proof ────────────────────────────────────────────────────
const paymentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'padelzone/payments',     // folder di Cloudinary
    allowed_formats: ALLOWED_FORMATS,
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  },
});

// ── Storage: QRIS Image ───────────────────────────────────────────────────────
const qrisStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'padelzone/qris',
    allowed_formats: ALLOWED_FORMATS,
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  },
});

// ── Storage: Event Image ──────────────────────────────────────────────────────
const eventStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'padelzone/events',
    allowed_formats: ALLOWED_FORMATS,
    transformation: [{ width: 1200, height: 630, crop: 'fill', quality: 'auto' }],
  },
});

// ── Multer instances ──────────────────────────────────────────────────────────
const uploadPayment = multer({
  storage: paymentStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

const uploadQris = multer({
  storage: qrisStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

const uploadEvent = multer({
  storage: eventStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

// ── Helper: buat middleware dengan error handling ─────────────────────────────
export const createUploadMiddleware = (multerInstance, fieldName) => {
  return (req, res, next) => {
    multerInstance.single(fieldName)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'Ukuran file terlalu besar. Maksimal 5 MB.' });
        }
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      }
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  };
};

// ── Helper: hapus file dari Cloudinary (saat replace) ────────────────────────
export const deleteFromCloudinary = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) return;
  try {
    // Extract public_id dari URL Cloudinary
    const parts = imageUrl.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return;
    // Ambil path setelah /upload/vXXXXXX/ atau /upload/
    const pathParts = parts.slice(uploadIndex + 1);
    // Kalau ada version (v1234567), skip
    if (pathParts[0].startsWith('v')) pathParts.shift();
    const publicId = pathParts.join('/').replace(/\.[^/.]+$/, ''); // hapus ekstensi
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary delete error:', err);
  }
};

export { uploadPayment, uploadQris, uploadEvent, cloudinary };
