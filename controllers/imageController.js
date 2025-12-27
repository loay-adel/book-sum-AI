import axios from "axios";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import crypto from "crypto";

// Configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads/images";
const THUMBNAIL_WIDTH = 200;
const MEDIUM_WIDTH = 400;
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

const getPublicUrl = (filename) => {

  if (process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV === 'true') {
    return `https://api.booksummarizer.net/uploads/${filename}`;
  }
  return `/uploads/images/${filename}`;
};

const getThumbnailUrl = (filename) => {
  if (process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV === 'true') {
    return `https://api.booksummarizer.net/uploads/thumbnails/${filename}`;
  }
  return `/uploads/images/thumbnails/${filename}`;
};

const getMediumUrl = (filename) => {
  if (process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV === 'true') {
    return `https://api.booksummarizer.net/uploads/medium/${filename}`;
  }
  return `/uploads/images/medium/${filename}`;
};

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Helper function to generate unique filename
const generateFilename = (originalName) => {
  const timestamp = Date.now();
  const hash = crypto.randomBytes(8).toString("hex");
  const ext = path.extname(originalName).toLowerCase();
  return `${timestamp}-${hash}${ext}`;
};

// Download and save image from URL
export const downloadAndSaveImage = async (imageUrl, bookTitle) => {
  try {
    console.log(`Downloading image from: ${imageUrl}`);
    
    // Validate URL
    if (!imageUrl || !imageUrl.startsWith('http')) {
      throw new Error('Invalid image URL');
    }

    // Generate filename from book title
    const safeTitle = bookTitle
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 50);
    
    const filename = `${safeTitle}-${Date.now()}.jpg`;
    const imagePath = path.join(UPLOAD_DIR, filename);
    
    // Download image
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'stream',
      timeout: 10000,
      headers: {
        'User-Agent': 'Bookwise-App/1.0'
      }
    });

    // Create write stream
    const writer = fs.createWriteStream(imagePath);
    
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`Image saved to: ${imagePath}`);
        
        // Generate thumbnail and medium versions
        generateImageVariants(imagePath)
          .then(variants => {
        resolve({
          original: getPublicUrl(filename),
          thumbnail: getThumbnailUrl(filename),
          medium: getMediumUrl(filename),
          filename: filename,
          path: imagePath
        });
          })
          .catch(err => reject(err));
      });
      
      writer.on('error', reject);
    });
    
  } catch (error) {
    console.error('Error downloading image:', error.message);
    
    // Return placeholder if download fails
    return {
      original: '/uploads/images/placeholder.jpg',
      thumbnail: '/uploads/images/thumbnails/placeholder.jpg',
      medium: '/uploads/images/medium/placeholder.jpg',
      filename: 'placeholder.jpg',
      isPlaceholder: true
    };
  }
};

// Generate thumbnail and medium versions
const generateImageVariants = async (originalPath) => {
  const filename = path.basename(originalPath);
  const thumbnailDir = path.join(UPLOAD_DIR, 'thumbnails');
  const mediumDir = path.join(UPLOAD_DIR, 'medium');
  
  // Create directories if they don't exist
  [thumbnailDir, mediumDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const thumbnailPath = path.join(thumbnailDir, filename);
  const mediumPath = path.join(mediumDir, filename);

  try {
    // Generate thumbnail
    await sharp(originalPath)
      .resize(THUMBNAIL_WIDTH, null, {
        fit: 'cover',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    // Generate medium size
    await sharp(originalPath)
      .resize(MEDIUM_WIDTH, null, {
        fit: 'cover',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toFile(mediumPath);

    return { thumbnailPath, mediumPath };
  } catch (error) {
    console.error('Error generating image variants:', error);
    throw error;
  }
};

// Check if image exists locally
export const getLocalImage = (bookTitle) => {
  try {
    const safeTitle = bookTitle
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 50);
    
    // Look for existing images for this book
    const files = fs.readdirSync(UPLOAD_DIR);
    const imageFile = files.find(file => 
      file.includes(safeTitle) && 
      ALLOWED_EXTENSIONS.includes(path.extname(file).toLowerCase())
    );

    if (imageFile) {
      return {
        original: `/uploads/images/${imageFile}`,
        thumbnail: `/uploads/images/thumbnails/${imageFile}`,
        medium: `/uploads/images/medium/${imageFile}`,
        filename: imageFile,
        exists: true
      };
    }

    return null;
  } catch (error) {
    console.error('Error checking local image:', error);
    return null;
  }
};

// Cache for image URLs to avoid repeated downloads
const imageCache = new Map();

// Main function to get or download book cover
export const getBookCover = async (bookTitle, author = '', forceDownload = false) => {
  const cacheKey = `${bookTitle}-${author}`.toLowerCase();
  
  // Check cache first
  if (!forceDownload && imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey);
  }

  // Check local storage first
  const localImage = getLocalImage(bookTitle);
  if (localImage && !forceDownload) {
    imageCache.set(cacheKey, localImage);
    return localImage;
  }

  // If not found locally, try to download from Open Library
  try {
    console.log(`Fetching cover for: ${bookTitle}`);
    
    // Search Open Library for book cover
    const searchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(bookTitle)}&limit=1`;
    const response = await axios.get(searchUrl, { timeout: 8000 });
    
    if (response.data.docs && response.data.docs.length > 0) {
      const book = response.data.docs[0];
      
      if (book.cover_i) {
        const coverUrl = `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`;
        
        // Download and save the image
        const savedImage = await downloadAndSaveImage(coverUrl, bookTitle);
        
        // Cache the result
        imageCache.set(cacheKey, savedImage);
        return savedImage;
      }
    }
    
    // If no cover found, use placeholder
    const placeholder = {
      original: '/uploads/images/placeholder.jpg',
      thumbnail: '/uploads/images/thumbnails/placeholder.jpg',
      medium: '/uploads/images/medium/placeholder.jpg',
      filename: 'placeholder.jpg',
      isPlaceholder: true
    };
    
    imageCache.set(cacheKey, placeholder);
      return {
    original: getPublicUrl(filename),
    thumbnail: getThumbnailUrl(filename),
    medium: getMediumUrl(filename),
    filename: filename,
    isPlaceholder: imageInfo.isPlaceholder || false
  }
    
  } catch (error) {
    console.error('Error getting book cover:', error.message);
    
    const placeholder = {
      original: getPublicUrl('placeholder.jpg'),
      thumbnail: getThumbnailUrl('placeholder.jpg'),
      medium: getMediumUrl('placeholder.jpg'),
      filename: 'placeholder.jpg',
      isPlaceholder: true
    };
    
    imageCache.set(cacheKey, placeholder);
    return placeholder;
  }
};

// Upload image directly (for admin or manual uploads)
export const uploadImage = async (file, bookTitle) => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    const filename = generateFilename(file.originalname);
    const filepath = path.join(UPLOAD_DIR, filename);
    
    // Move uploaded file
    fs.renameSync(file.path, filepath);
    
    // Generate variants
    await generateImageVariants(filepath);
    
    return {
      original: `/uploads/images/${filename}`,
      thumbnail: `/uploads/images/thumbnails/${filename}`,
      medium: `/uploads/images/medium/${filename}`,
      filename: filename
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Clean up old images (cron job)
export const cleanupOldImages = async (daysOld = 30) => {
  try {
    const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const files = fs.readdirSync(UPLOAD_DIR);
    
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(UPLOAD_DIR, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isFile() && stats.mtimeMs < cutoffDate) {
        // Delete original and variants
        fs.unlinkSync(filePath);
        
        const thumbnailPath = path.join(UPLOAD_DIR, 'thumbnails', file);
        const mediumPath = path.join(UPLOAD_DIR, 'medium', file);
        
        if (fs.existsSync(thumbnailPath)) fs.unlinkSync(thumbnailPath);
        if (fs.existsSync(mediumPath)) fs.unlinkSync(mediumPath);
        
        deletedCount++;
      }
    }
    
    return { deleted: deletedCount };
  } catch (error) {
    console.error('Error cleaning up images:', error);
    throw error;
  }
};