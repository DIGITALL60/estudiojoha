import sharp from 'sharp';
import path from 'path';

async function removeBackground() {
  const input = path.join('C:', 'Users', 'Carlos', '.gemini', 'antigravity-ide', 'brain', '6680c2a4-b1d3-4e5f-8713-619524347204', 'media__1782920440092.jpg');
  const output = path.join('artifacts', 'barber-mt', 'public', 'logo.png');

  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Sample the background color from the top-left corner
  const bgR = data[0];
  const bgG = data[1];
  const bgB = data[2];
  console.log(`Background color sampled: rgb(${bgR}, ${bgG}, ${bgB})`);

  // Tolerance: if a pixel is within this distance from the background color, make it transparent
  const tolerance = 40;

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const dr = Math.abs(r - bgR);
    const dg = Math.abs(g - bgG);
    const db = Math.abs(b - bgB);
    const dist = Math.sqrt(dr*dr + dg*dg + db*db);

    if (dist < tolerance) {
      // Background pixel — fully transparent
      data[i + 3] = 0;
    } else if (dist < tolerance + 20) {
      // Edge pixel — partial transparency for smooth anti-aliasing
      data[i + 3] = Math.round(((dist - tolerance) / 20) * 255);
    } else {
      // Foreground pixel — keep fully opaque
      data[i + 3] = 255;
    }
  }

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels }
  })
    .png()
    .toFile(output);

  console.log('Done! Pink background removed.');
}

removeBackground();
