#!/usr/bin/env node

/**
 * Generate icon PNG files from SVG using canvas
 * Run: node scripts/generate-icons.js
 */

const canvas = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [192, 512];
const svgPath = path.join(__dirname, '../public/icon.svg');
const publicDir = path.join(__dirname, '../public');

async function generateIcons() {
  try {
    // Read SVG
    const svgContent = fs.readFileSync(svgPath, 'utf8');

    for (const size of sizes) {
      // Create canvas
      const c = canvas.createCanvas(size, size);
      const ctx = c.getContext('2d');

      // Draw background
      ctx.fillStyle = '#F5F0EA';
      ctx.fillRect(0, 0, size, size);

      // Draw rounded corners
      ctx.fillStyle = '#F5F0EA';
      const radius = size * 0.25;
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(size - radius, 0);
      ctx.quadraticCurveTo(size, 0, size, radius);
      ctx.lineTo(size, size - radius);
      ctx.quadraticCurveTo(size, size, size - radius, size);
      ctx.lineTo(radius, size);
      ctx.quadraticCurveTo(0, size, 0, size - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.fill();

      // Draw accent circle
      ctx.fillStyle = 'rgba(200, 169, 110, 0.1)';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, (size * 75) / 192, 0, Math.PI * 2);
      ctx.fill();

      // Draw strokes
      const centerX = size / 2;
      const centerY = size / 2;
      const scale = size / 192;

      ctx.strokeStyle = '#C8A96E';
      ctx.lineWidth = 6 * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Left stroke
      ctx.beginPath();
      ctx.moveTo(centerX - 20 * scale, centerY + 20 * scale);
      ctx.lineTo(centerX - 10 * scale, centerY);
      ctx.lineTo(centerX, centerY - 20 * scale);
      ctx.stroke();

      // Right stroke (darker)
      ctx.strokeStyle = '#8B6914';
      ctx.beginPath();
      ctx.moveTo(centerX + 20 * scale, centerY + 20 * scale);
      ctx.lineTo(centerX + 10 * scale, centerY);
      ctx.lineTo(centerX, centerY - 20 * scale);
      ctx.stroke();

      // Center accent
      ctx.fillStyle = '#C8A96E';
      ctx.beginPath();
      ctx.arc(centerX, centerY - 20 * scale, 4 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Save PNG
      const buffer = c.toBuffer('image/png');
      const filePath = path.join(publicDir, `icon-${size}x${size}.png`);
      fs.writeFileSync(filePath, buffer);
      console.log(`Generated: ${filePath}`);
    }

    console.log('Icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
