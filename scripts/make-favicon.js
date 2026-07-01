import sharp from 'sharp';
import path from 'path';

async function processImage() {
  const input = path.join('C:', 'Users', 'Carlos', '.gemini', 'antigravity-ide', 'brain', '6680c2a4-b1d3-4e5f-8713-619524347204', 'media__1782919259095.png');
  const faviconPngOut = path.join('artifacts', 'barber-mt', 'public', 'favicon.png');
  
  try {
    // The image is 1024x1024. The black text and ring are on the outer edge.
    // We crop a 500x500 box from the center to get only the face/hand and pink background.
    // Then we can make the corners transparent by applying a circular mask.
    const circleSvg = `<svg width="500" height="500"><circle cx="250" cy="250" r="250" fill="white"/></svg>`;

    await sharp(input)
      .extract({ width: 500, height: 500, left: 262, top: 262 }) // roughly center
      .composite([{
        input: Buffer.from(circleSvg),
        blend: 'dest-in'
      }])
      .png()
      .toFile(faviconPngOut);

    console.log('Favicon PNG cropped and generated successfully');
  } catch (err) {
    console.error('Error processing image:', err);
  }
}

processImage();
