import sharp from 'sharp';
import path from 'path';

async function removeBackground() {
  const input = path.join('C:', 'Users', 'Carlos', '.gemini', 'antigravity-ide', 'brain', '6680c2a4-b1d3-4e5f-8713-619524347204', 'media__1782919259095.png');
  const output = path.join('artifacts', 'barber-mt', 'public', 'logo.png');

  try {
    const { data, info } = await sharp(input)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // The logo background is light pink/purple.
    // The logo text and lines are dark (black/dark grey).
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const brightness = (r + g + b) / 3;
      
      // If the pixel is very bright (part of the background), make it transparent.
      // If it is dark (part of the lines/text), keep it opaque.
      
      let alpha = 255;
      if (brightness > 200) {
        alpha = 0; // Pure background
      } else if (brightness > 100) {
        // Anti-aliasing edge
        alpha = 255 - ((brightness - 100) * 2.55);
      }
      
      if (alpha < 0) alpha = 0;
      if (alpha > 255) alpha = 255;
      
      data[i + 3] = alpha;
      
      // Force the lines to be black for better visibility, or keep original?
      // Keeping original RGB makes it smoother. We just change the alpha.
      if (alpha > 0) {
        data[i] = 42;
        data[i + 1] = 16;
        data[i + 2] = 20; // dark ink color #2a1014
      }
    }

    await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: info.channels
      }
    })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 })
    .png()
    .toFile(output);

    console.log('Background removed successfully!');
  } catch (err) {
    console.error(err);
  }
}

removeBackground();
