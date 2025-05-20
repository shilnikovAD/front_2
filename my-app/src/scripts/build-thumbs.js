const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Папки
const SRC_DIR  = path.join(__dirname, '../src/images/full');
const OUT_DIR  = path.join(__dirname, '../src/images/thumbs');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

// Параметры миниатюр
const WIDTH   = 300;    // или любое удобное значение
const QUALITY = 60;     // процент качества JPG/PNG

fs.readdirSync(SRC_DIR).forEach(file => {
  const ext = path.extname(file).toLowerCase();
  const name = path.basename(file, ext);
  const input  = path.join(SRC_DIR, file);
  const output = path.join(OUT_DIR, name + '-thumb' + ext);

  let pipeline = sharp(input).resize({ width: WIDTH });

  if (ext === '.jpg' || ext === '.jpeg') {
    pipeline = pipeline.jpeg({ quality: QUALITY });
  } else if (ext === '.png') {
    pipeline = pipeline.png({ quality: QUALITY, compressionLevel: 8 });
  }

  pipeline
    .toFile(output)
    .then(() => console.log(`${name} → thumb создан`))
    .catch(err => console.error(`Ошибка с ${file}:`, err));
});
