const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../assets/images/logo.svg');
const outputDir = path.join(__dirname, '../assets/images');

// Tamanhos necessários para iOS e Android
const sizes = {
  // iOS
  'icon.png': 1024,
  'icon@2x.png': 1024,
  'icon@3x.png': 1024,
  
  // Android
  'android-icon-foreground.png': 1024,
  'android-icon-background.png': 1024,
  'android-icon-monochrome.png': 1024,
  
  // Splash e favicon
  'splash-icon.png': 512,
  'favicon.png': 32,
};

async function generateIcons() {
  console.log('Gerando ícones a partir do SVG...');
  
  for (const [filename, size] of Object.entries(sizes)) {
    const outputPath = path.join(outputDir, filename);
    
    try {
      await sharp(svgPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Gerado: ${filename} (${size}x${size})`);
    } catch (error) {
      console.error(`✗ Erro ao gerar ${filename}:`, error.message);
    }
  }
  
  console.log('\n✓ Todos os ícones foram gerados!');
}

generateIcons().catch(console.error);
