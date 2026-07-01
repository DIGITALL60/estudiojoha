import sharp from 'sharp';
import path from 'path';

async function makeCircularLogo() {
  const input = path.join('C:', 'Users', 'Carlos', '.gemini', 'antigravity-ide', 'brain', '6680c2a4-b1d3-4e5f-8713-619524347204', 'media__1782920440092.jpg');
  const output = path.join('artifacts', 'barber-mt', 'public', 'logo.png');

  try {
    // Resize to a perfect square and apply circular crop to remove white corners
    const size = 400;
    const circleMask = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`
    );

    await sharp(input)
      .resize(size, size, { fit: 'cover', position: 'center' })
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png()
      .toFile(output);

    console.log('Circular logo created!');
  } catch (err) {
    console.error(err);
  }
}

makeCircularLogo();
