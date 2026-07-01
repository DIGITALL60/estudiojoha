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

    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const brightness = (r + g + b) / 3;
      
      let alpha = 255 - (brightness * 1.5);
      if (alpha < 0) alpha = 0;
      if (alpha > 255) alpha = 255;
      
      data[i + 3] = alpha;
      
      // dark grey
      data[i] = 20;
      data[i + 1] = 20;
      data[i + 2] = 20;
    }

    // Now re-process the buffer to trim transparent borders
    await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: info.channels
      }
    })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 }) // trim transparent edges
    .png()
    .toFile(output);

    console.log('Background removed and trimmed successfully!');
  } catch (err) {
    console.error(err);
  }
}

removeBackground();
