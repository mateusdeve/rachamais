# Arquivos de Imagem que Podem Ser Removidos

## ✅ Arquivos em Uso (NÃO DELETAR)

### Configuração do App (app.json):
- `assets/images/icons/apple-icon.png` - Ícone principal iOS
- `assets/images/icons/android-icon-192x192.png` - Android foreground
- `assets/images/android-icon-background.png` - Android background
- `assets/images/android-icon-monochrome.png` - Android monochrome
- `assets/images/icons/favicon.ico` - Web favicon
- `assets/images/icons/manifest.json` - Web manifest
- `assets/images/logo.png` - Splash screen e tela de login
- `assets/images/icons/android-icon-96x96.png` - Notificações

### Arquivos Originais (manter):
- `assets/images/logo.svg` - Fonte original do logo

### Pasta icons/ (todos os arquivos):
- Todos os arquivos em `assets/images/icons/` são usados pelo manifest.json, browserconfig.xml ou podem ser necessários para builds futuros

## ❌ Arquivos que PODEM SER DELETADOS

### Ícones antigos (substituídos pelos da pasta icons/):
1. `assets/images/icon.png` - Substituído por `icons/apple-icon.png`
2. `assets/images/android-icon-foreground.png` - Substituído por `icons/android-icon-192x192.png`
3. `assets/images/favicon.png` - Substituído por `icons/favicon.ico`
4. `assets/images/splash-icon.png` - Não está sendo usado (splash usa `logo.png`)

### Logos padrão do Expo/React (não usados):
5. `assets/images/react-logo.png`
6. `assets/images/react-logo@2x.png`
7. `assets/images/react-logo@3x.png`
8. `assets/images/partial-react-logo.png`

## 📝 Comandos para Deletar

```bash
# Deletar ícones antigos substituídos
rm assets/images/icon.png
rm assets/images/android-icon-foreground.png
rm assets/images/favicon.png
rm assets/images/splash-icon.png

# Deletar logos padrão do Expo/React
rm assets/images/react-logo.png
rm assets/images/react-logo@2x.png
rm assets/images/react-logo@3x.png
rm assets/images/partial-react-logo.png
```

## ⚠️ Atenção

- **NÃO deletar** `logo.png` - está sendo usado no splash screen e na tela de login
- **NÃO deletar** `logo.svg` - é a fonte original
- **NÃO deletar** arquivos da pasta `icons/` - são necessários para builds
- **NÃO deletar** `android-icon-background.png` e `android-icon-monochrome.png` - ainda estão referenciados no app.json
