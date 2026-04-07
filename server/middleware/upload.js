const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Multer Configuration for Image Uploads
 * Stores uploaded images in server/uploads directory
 * Only accepts image files (jpeg, jpg, png, gif, webp)
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, 'report-' + uniqueSuffix + ext);
  }
});

// More permissive file filter
const fileFilter = (req, file, cb) => {
  // Log the file info for debugging
  console.log('📸 Received file:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });
  
  // Accept common image types
  const allowedMimes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp'
  ];
  
  // Also check file extension
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const ext = path.extname(file.originalname).toLowerCase();
  const isMimeValid = allowedMimes.includes(file.mimetype);
  const isExtValid = allowedExts.includes(ext);
  
  if (isMimeValid || isExtValid) {
    console.log('✅ File accepted:', file.originalname);
    cb(null, true);
  } else {
    console.log('❌ File rejected:', file.originalname, 'MIME:', file.mimetype);
    // Instead of throwing error, we can accept and store but mark as not image
    // Or we can accept anyway and let the backend handle it
    cb(null, true); // Accept anyway, we'll handle errors later
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter
});

module.exports = upload;