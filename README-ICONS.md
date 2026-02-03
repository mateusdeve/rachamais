# Gerando Ícones do App

O logo oficial do projeto está em `assets/images/logo.svg`.

## Opção 1: Usar ferramenta online (Recomendado)

1. Acesse https://www.favicon-generator.org/ ou https://realfavicongenerator.net/
2. Faça upload do arquivo `assets/images/logo.svg`
3. Gere os ícones nos tamanhos:
   - **iOS**: 1024x1024px (icon.png)
   - **Android**: 1024x1024px (android-icon-foreground.png)
   - **Splash**: 512x512px (splash-icon.png)
   - **Favicon**: 32x32px (favicon.png)

## Opção 2: Usar ImageMagick (se instalado)

```bash
# Converter SVG para PNG 1024x1024
convert -background none -resize 1024x1024 assets/images/logo.svg assets/images/icon.png

# Android foreground (mesmo tamanho)
cp assets/images/icon.png assets/images/android-icon-foreground.png

# Splash (512x512)
convert -background none -resize 512x512 assets/images/logo.svg assets/images/splash-icon.png

# Favicon (32x32)
convert -background none -resize 32x32 assets/images/logo.svg assets/images/favicon.png
```

## Opção 3: Instalar sharp e usar o script

```bash
npm install --save-dev sharp
npm run generate-icons
```

## Tamanhos necessários

- `icon.png`: 1024x1024px (iOS)
- `android-icon-foreground.png`: 1024x1024px (Android)
- `android-icon-background.png`: 1024x1024px (pode ser uma cor sólida #22C55E)
- `android-icon-monochrome.png`: 1024x1024px (versão monocromática)
- `splash-icon.png`: 512x512px (splash screen)
- `favicon.png`: 32x32px (web)

## Nota

O Expo também aceita SVG diretamente em algumas configurações, mas para a App Store é recomendado usar PNG.
