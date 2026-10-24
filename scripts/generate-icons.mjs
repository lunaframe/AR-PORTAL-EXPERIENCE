import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const sourceImgPath = 'C:/Users/rbakh/.gemini/antigravity-ide/brain/42f57297-3d70-4ae9-a473-462959dc5dc4/ar_portal_icon_1789196769686.jpg';
const outputDir = path.resolve('public/icons');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('Generating PWA icons from:', sourceImgPath);

  // 1. Standard 512x512
  await sharp(sourceImgPath)
    .resize(512, 512, { fit: 'cover' })
    .png({ quality: 95 })
    .toFile(path.join(outputDir, 'icon-512.png'));
  console.log('✓ icon-512.png created');

  // 2. Standard 192x192
  await sharp(sourceImgPath)
    .resize(192, 192, { fit: 'cover' })
    .png({ quality: 95 })
    .toFile(path.join(outputDir, 'icon-192.png'));
  console.log('✓ icon-192.png created');

  // 3. Apple Touch Icon 180x180
  await sharp(sourceImgPath)
    .resize(180, 180, { fit: 'cover' })
    .png({ quality: 95 })
    .toFile(path.join(outputDir, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png created');

  // 4. Maskable 512x512 (safe zone padding + #050008 background)
  const inner512 = await sharp(sourceImgPath)
    .resize(410, 410, { fit: 'cover' })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 5, g: 0, b: 8, alpha: 1 }
    }
  })
  .composite([{ input: inner512, gravity: 'center' }])
  .png({ quality: 95 })
  .toFile(path.join(outputDir, 'icon-512-maskable.png'));
  console.log('✓ icon-512-maskable.png created');

  // 5. Maskable 192x192
  const inner192 = await sharp(sourceImgPath)
    .resize(154, 154, { fit: 'cover' })
    .toBuffer();

  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 5, g: 0, b: 8, alpha: 1 }
    }
  })
  .composite([{ input: inner192, gravity: 'center' }])
  .png({ quality: 95 })
  .toFile(path.join(outputDir, 'icon-192-maskable.png'));
  console.log('✓ icon-192-maskable.png created');

  // 6. Favicon
  await sharp(sourceImgPath)
    .resize(64, 64, { fit: 'cover' })
    .png()
    .toFile(path.join(outputDir, 'favicon-64.png'));
  await sharp(sourceImgPath)
    .resize(32, 32, { fit: 'cover' })
    .png()
    .toFile(path.join('public', 'favicon.ico'));
  console.log('✓ favicon.ico created');

  console.log('All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
