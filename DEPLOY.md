# Guia de Deploy - RachaMais

## 📱 Preparação para App Store

### 1. Gerar Ícones

O logo oficial está em `assets/images/logo.svg`. Você precisa gerar os ícones PNG:

**Opção rápida (online):**
1. Acesse https://www.favicon-generator.org/
2. Faça upload de `assets/images/logo.svg`
3. Gere:
   - `icon.png`: 1024x1024px
   - `android-icon-foreground.png`: 1024x1024px
   - `splash-icon.png`: 512x512px
   - `favicon.png`: 32x32px

**Para Android:**
- `android-icon-background.png`: Pode ser uma imagem sólida verde (#22C55E) de 1024x1024px
- `android-icon-monochrome.png`: Versão monocromática do logo

### 2. Configurar EAS

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login no Expo
eas login

# Configurar credenciais
eas build:configure
```

### 3. Atualizar eas.json

Edite `eas.json` e preencha:
- `appleId`: Seu email da Apple Developer
- `ascAppId`: ID do app no App Store Connect (criar depois)
- `appleTeamId`: ID do seu time da Apple Developer

### 4. Criar App no App Store Connect

1. Acesse https://appstoreconnect.apple.com
2. Apps → + → New App
3. Preencha:
   - **Name**: RachaMais
   - **Primary Language**: Portuguese (Brazil)
   - **Bundle ID**: com.rachamais.app
   - **SKU**: rachamais-001

### 5. Build de Produção

```bash
# Build iOS
eas build --platform ios --profile production

# Build Android (opcional)
eas build --platform android --profile production
```

### 6. Submeter para App Store

```bash
# Submissão automática
eas submit --platform ios --profile production
```

### 7. Preencher Informações no App Store Connect

**Obrigatório:**
- Screenshots (pelo menos 6.5" e 5.5")
- Descrição do app
- Palavras-chave
- Categoria
- Política de privacidade (URL)
- Informações de contato

**Screenshots necessários:**
- iPhone 6.5" (iPhone 14 Pro Max): 1290 x 2796 px
- iPhone 5.5" (iPhone 8 Plus): 1242 x 2208 px

### 8. Variáveis de Ambiente (se necessário)

Se precisar de variáveis de ambiente no build, adicione em `eas.json`:

```json
"production": {
  "env": {
    "DATABASE_URL": "...",
    "JWT_SECRET": "..."
  }
}
```

## 🚀 Comandos Úteis

```bash
# Ver builds
eas build:list

# Ver logs
eas build:view

# Atualizar credenciais
eas credentials

# Testar build localmente (requer Xcode)
eas build --platform ios --local
```

## ⚠️ Checklist Antes de Submeter

- [ ] Ícone 1024x1024px gerado
- [ ] Bundle ID configurado (com.rachamais.app)
- [ ] Versão e build number corretos
- [ ] Screenshots preparados
- [ ] Descrição e palavras-chave escritas
- [ ] Política de privacidade publicada
- [ ] App testado em dispositivo real
- [ ] Variáveis de ambiente configuradas (se necessário)

## 📝 Notas

- O processo de build leva ~15-30 minutos
- Processamento da Apple: 1-2 horas
- Revisão da Apple: 1-7 dias (geralmente 24-48h)
