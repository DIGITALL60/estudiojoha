import sharp from 'sharp';
import path from 'path';

async function extractSilhouette() {
  const input = path.join('C:', 'Users', 'Carlos', '.gemini', 'antigravity-ide', 'brain', '6680c2a4-b1d3-4e5f-8713-619524347204', 'media__1782919259095.png');
  const output = path.join('artifacts', 'barber-mt', 'public', 'logo.png');

  try {
    const { data, info } = await sharp(input)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // We want to extract dark lines (silhouette) and make everything else transparent.
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Calculate brightness (0 = black, 255 = white)
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
      
      // We want dark pixels to be opaque, and light pixels (background) to be transparent.
      // If brightness is < 100, it's definitely the black lines.
      // If brightness is > 180, it's definitely the pink/white background.
      
      let alpha = 255;
      if (brightness > 180) {
        alpha = 0;
      } else if (brightness > 80) {
        // smooth transition for anti-aliasing
        alpha = 255 - ((brightness - 80) * (255 / 100));
      }
      
      if (alpha < 0) alpha = 0;
      if (alpha > 255) alpha = 255;
      
      // Make the pixel color dark ink (#2a1014) to be consistent with the site
      // But only if it has some opacity, to preserve nice edges.
      // Actually, if we just set the color to pure black and rely entirely on alpha for the edge smoothness:
      data[i] = 42;     // R
      data[i+1] = 16;   // G
      data[i+2] = 20;   // B
      data[i+3] = alpha;
    }

    await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: info.channels
      }
    })
    // Do NOT trim to preserve the original symmetry and centering
    .png()
    .toFile(output);

    console.log('Silhouette extracted perfectly without trimming!');
  } catch (err) {
    console.error(err);
  }
}

extractSilhouette();
