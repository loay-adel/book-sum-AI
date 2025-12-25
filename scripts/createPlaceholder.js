// scripts/createPlaceholder.js
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const createPlaceholder = async () => {
  const uploadDir = 'uploads/images';
  const thumbnailDir = path.join(uploadDir, 'thumbnails');
  const mediumDir = path.join(uploadDir, 'medium');
  
  // Create directories
  [uploadDir, thumbnailDir, mediumDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Create SVG placeholder
  const svg = `
    <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#374151"/>
      <text x="50%" y="50%" text-anchor="middle" fill="#9CA3AF" font-family="Arial" font-size="24">
        No Cover
      </text>
      <text x="50%" y="60%" text-anchor="middle" fill="#6B7280" font-family="Arial" font-size="16">
        Book Image
      </text>
    </svg>
  `;

  // Create placeholder image
  await sharp(Buffer.from(svg))
    .jpeg({ quality: 90 })
    .toFile(path.join(uploadDir, 'placeholder.jpg'));

  // Create thumbnail version
  await sharp(Buffer.from(svg))
    .resize(200, 300)
    .jpeg({ quality: 80 })
    .toFile(path.join(thumbnailDir, 'placeholder.jpg'));

  // Create medium version
  await sharp(Buffer.from(svg))
    .resize(400, 600)
    .jpeg({ quality: 85 })
    .toFile(path.join(mediumDir, 'placeholder.jpg'));

  console.log('✅ Placeholder images created');
};

createPlaceholder();