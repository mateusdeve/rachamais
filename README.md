# RachaMais - App de Divisão de Contas

App React Native com Expo para dividir contas entre amigos de forma rápida e justa.

## 🚀 Tecnologias

- **Expo SDK 54+** (Managed Workflow)
- **Expo Router** (file-based routing)
- **TypeScript**
- **NativeWind** (Tailwind CSS para React Native)
- **@expo/vector-icons** (Ícones)
- **AsyncStorage** (Armazenamento local)

## 📦 Instalação

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar NativeWind

O NativeWind já está configurado nos arquivos:
- `tailwind.config.js`
- `metro.config.js`
- `nativewind-env.d.ts`
- `global.css`

### 3. Executar o projeto

```bash
# Iniciar o servidor de desenvolvimento
npm start

# Executar no iOS
npm run ios

# Executar no Android
npm run android

# Executar na Web
npm run web
```

## 📱 Estrutura do Projeto

```
rachamais/
├── app/
│   ├── (auth)/          # Telas de autenticação
│   │   ├── onboarding.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/          # Telas principais com tabs
│   │   ├── index.tsx     # Home - Lista de grupos
│   │   ├── activity.tsx  # Atividades
│   │   └── profile.tsx   # Perfil
│   ├── group/            # Telas de grupos
│   │   ├── create.tsx    # Criar grupo
│   │   └── [id]/         # Detalhes do grupo
│   │       ├── index.tsx
│   │       ├── add-expense.tsx
│   │       ├── balances.tsx
│   │       └── invite.tsx
│   └── _layout.tsx       # Layout raiz
├── components/
│   ├── ui/               # Componentes UI reutilizáveis
│   ├── groups/           # Componentes de grupos
│   ├── expenses/         # Componentes de despesas
│   └── balances/         # Componentes de saldos
├── constants/
│   ├── colors.ts         # Cores do tema
│   └── mockData.ts       # Dados mock para desenvolvimento
├── types/
│   └── index.ts          # Tipos TypeScript
└── lib/
    └── utils.ts          # Utilitários (cn function)
```

## 🎨 Telas Implementadas

### Autenticação
- ✅ Onboarding (3 slides)
- ✅ Login
- ✅ Registro

### Principal
- ✅ Home (Lista de grupos)
- ✅ Criar Grupo
- ✅ Detalhe do Grupo
- ✅ Adicionar Despesa
- ✅ Saldos (Quem deve o quê)
- ✅ Convidar
- ✅ Perfil/Configurações

## 📝 Funcionalidades

- **Navegação completa** entre todas as telas
- **Dados mock** para desenvolvimento
- **Design fiel** ao HTML fornecido
- **Componentes reutilizáveis** organizados
- **TypeScript** com tipagem completa
- **NativeWind** para estilização

## 🔧 Próximos Passos

Esta é a **Parte 1** - Telas Estáticas. As próximas etapas incluirão:

- Integração com backend/API
- Validação de formulários
- Lógica de negócio
- Persistência de dados
- Autenticação real
- Notificações push

## 📄 Licença

Este projeto é privado.
