import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET!;

// Verificar variáveis de ambiente críticas na inicialização
if (!JWT_SECRET) {
  console.error(
    "ERRO CRÍTICO: JWT_SECRET não está definido nas variáveis de ambiente!",
  );
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// ===== VALIDATIONS =====
const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

const createGroupSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  emoji: z.string().default("👥"),
  description: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).optional(),
  emoji: z.string().optional(),
  description: z.string().optional(),
});

const joinGroupSchema = z.object({
  inviteCode: z.string().min(1, "Código é obrigatório"),
});

const createExpenseSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.number().positive("Valor deve ser positivo"),
  paidById: z.string(),
  category: z
    .enum([
      "FOOD",
      "TRANSPORT",
      "ACCOMMODATION",
      "ENTERTAINMENT",
      "SHOPPING",
      "UTILITIES",
      "HEALTH",
      "OTHER",
    ])
    .default("OTHER"),
  splitType: z
    .enum(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"])
    .default("EQUAL"),
  splits: z.array(
    z.object({
      userId: z.string(),
      amount: z.number().optional(),
      percentage: z.number().optional(),
    }),
  ),
  date: z.string().datetime().optional(),
});

const createSettlementSchema = z.object({
  fromUserId: z.string(),
  toUserId: z.string(),
  amount: z.number().positive("Valor deve ser positivo"),
  paymentMethod: z
    .enum(["PIX", "CASH", "TRANSFER", "CREDIT_CARD", "OTHER"])
    .default("PIX"),
  note: z.string().optional(),
});

// ===== AUTH HELPERS =====
interface JWTPayload {
  userId: string;
  email: string;
}

function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

function getUserFromRequest(req: express.Request): JWTPayload | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.substring(7);
  return verifyToken(token);
}

// ===== PÁGINA DE CONVITE =====
// Link HTTPS é clicável no WhatsApp. Ao abrir, o usuário toca em "Abrir no app" e o app abre (rachamais://).
const PUBLIC_APP_URL = "app.rachamais.com.br";
const APP_STORE_URL = "https://apps.apple.com/app/id6479499344";

app.get("/invite/:code", (req, res) => {
  const { code } = req.params;
  const appLink = `rachamais://invite/${code}`;
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#10b748">
  <title>Convite RachaMais</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #F9FAFB;
      color: #111813;
      text-align: center;
      line-height: 1.5;
    }
    
    .container {
      width: 100%;
      max-width: 480px;
      padding: 32px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
    }
    
    .logo-container {
      width: 120px;
      height: 120px;
      border-radius: 60px;
      background: rgba(16, 183, 72, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 64px;
      margin-bottom: 8px;
    }
    
    h1 {
      font-size: 32px;
      font-weight: 700;
      line-height: 40px;
      color: #111813;
      margin-bottom: 8px;
    }
    
    .subtitle {
      font-size: 16px;
      font-weight: 400;
      line-height: 24px;
      color: #6B7280;
      margin-bottom: 32px;
      max-width: 320px;
    }
    
    .card {
      width: 100%;
      background: #FFFFFF;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      border: 1px solid #E5E7EB;
    }
    
    .card-title {
      font-size: 20px;
      font-weight: 600;
      line-height: 28px;
      color: #111813;
      margin-bottom: 12px;
    }
    
    .card-text {
      font-size: 16px;
      font-weight: 400;
      line-height: 24px;
      color: #6B7280;
      margin-bottom: 24px;
    }
    
    .button {
      display: inline-block;
      width: 100%;
      padding: 16px 24px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 700;
      text-decoration: none;
      text-align: center;
      transition: all 0.2s ease;
      border: none;
      cursor: pointer;
      margin-bottom: 12px;
    }
    
    .button-primary {
      background: #10b748;
      color: #FFFFFF;
      box-shadow: 0 2px 8px rgba(16, 183, 72, 0.2);
    }
    
    .button-primary:hover {
      background: #059669;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(16, 183, 72, 0.3);
    }
    
    .button-primary:active {
      transform: translateY(0);
    }
    
    .button-secondary {
      background: #FFFFFF;
      color: #111813;
      border: 1px solid #E5E7EB;
    }
    
    .button-secondary:hover {
      background: #F9FAFB;
      border-color: #10b748;
    }
    
    .divider {
      display: flex;
      align-items: center;
      width: 100%;
      margin: 24px 0;
      gap: 12px;
    }
    
    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #E5E7EB;
    }
    
    .divider-text {
      font-size: 12px;
      font-weight: 400;
      color: #9CA3AF;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .footer {
      margin-top: 32px;
      font-size: 14px;
      color: #9CA3AF;
    }
    
    @media (max-width: 480px) {
      .container {
        padding: 24px 16px;
      }
      
      h1 {
        font-size: 24px;
        line-height: 32px;
      }
      
      .logo-container {
        width: 100px;
        height: 100px;
        font-size: 56px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-container">💰</div>
    <h1>RachaMais</h1>
    <p class="subtitle">Divida contas sem complicação</p>
    
    <div class="card">
      <h2 class="card-title">Você foi convidado!</h2>
      <p class="card-text">Toque no botão abaixo para abrir no app e entrar no grupo.</p>
      
      <a href="${appLink}" class="button button-primary">Abrir no app</a>
      
      <div class="divider">
        <span class="divider-text">ou</span>
      </div>
      
      <a href="${APP_STORE_URL}" class="button button-secondary">Baixar na App Store</a>
    </div>
    
    <p class="footer">RachaMais © 2026</p>
  </div>
</body>
</html>`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// ===== BALANCE HELPER =====
async function calculateUserBalance(
  groupId: string,
  userId: string,
): Promise<number> {
  // Total que o usuário pagou em despesas
  const paidExpenses = await prisma.expense.aggregate({
    where: { groupId, paidById: userId },
    _sum: { amount: true },
  });
  const totalPaid = Number(paidExpenses._sum.amount || 0);

  // Total que o usuário deve (splits das despesas)
  const userSplits = await prisma.expenseSplit.aggregate({
    where: { expense: { groupId }, userId },
    _sum: { amount: true },
  });
  const totalOwed = Number(userSplits._sum.amount || 0);

  // Settlements recebidos (alguém pagou para o usuário)
  const received = await prisma.settlement.aggregate({
    where: { groupId, toUserId: userId },
    _sum: { amount: true },
  });
  const totalReceived = Number(received._sum.amount || 0);

  // Settlements pagos pelo usuário (usuário pagou para alguém)
  const paid = await prisma.settlement.aggregate({
    where: { groupId, fromUserId: userId },
    _sum: { amount: true },
  });
  const totalSettlementPaid = Number(paid._sum.amount || 0);

  // Saldo = (o que pagou em despesas - o que deve em splits) - (settlements recebidos) + (settlements pagos)
  // Lógica:
  // - totalPaid - totalOwed: Saldo base baseado em despesas (crédito se positivo, débito se negativo)
  // - totalReceived: Reduz o crédito (alguém te pagou, então não deve mais) ou reduz o débito (você recebeu pagamento)
  // - totalSettlementPaid: Aumenta o crédito (você pagou, então alguém te deve menos) ou aumenta o débito (você pagou)
  // Se positivo: usuário tem crédito (alguém deve para ele)
  // Se negativo: usuário tem débito (ele deve para alguém)
  return totalPaid - totalOwed - totalReceived + totalSettlementPaid;
}

// ===== AUTH ROUTES =====
app.post("/api/auth/register", async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: validation.error.errors[0].message });
    }

    const { name, email, password } = validation.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "Email já cadastrado" });
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    const token = generateToken({ userId: user.id, email: user.email });
    res.status(201).json({ user, token });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: validation.error.errors[0].message });
    }

    const { email, password } = validation.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await comparePassword(password, user.password))) {
      return res.status(401).json({ error: "Email ou senha inválidos" });
    }

    if (!JWT_SECRET) {
      console.error("ERRO: JWT_SECRET não está definido!");
      return res
        .status(500)
        .json({ error: "Erro de configuração do servidor" });
    }

    const token = generateToken({ userId: user.id, email: user.email });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.get("/api/auth/me", async (req, res) => {
  const payload = getUserFromRequest(req);
  if (!payload) return res.status(401).json({ error: "Não autorizado" });

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        pixKey: true,
        createdAt: true,
      },
    });

    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json(user);
  } catch (error) {
    console.error("Me error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ===== GROUPS ROUTES =====
app.get("/api/groups", async (req, res) => {
  const payload = getUserFromRequest(req);
  if (!payload) return res.status(401).json({ error: "Não autorizado" });

  try {
    const groups = await prisma.group.findMany({
      where: { members: { some: { userId: payload.userId } } },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        _count: { select: { members: true, expenses: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const groupsWithBalance = await Promise.all(
      groups.map(async (group) => ({
        ...group,
        membersCount: group._count.members,
        userBalance: await calculateUserBalance(group.id, payload.userId),
      })),
    );

    res.json(groupsWithBalance);
  } catch (error) {
    console.error("List groups error:", error);
    res.status(500).json({ error: "Erro ao listar grupos" });
  }
});

app.post("/api/groups", async (req, res) => {
  const payload = getUserFromRequest(req);
  if (!payload) return res.status(401).json({ error: "Não autorizado" });

  try {
    const validation = createGroupSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: validation.error.errors[0].message });
    }

    const { name, emoji, description, memberIds } = validation.data;

    const group = await prisma.group.create({
      data: {
        name,
        emoji: emoji || "👥",
        description,
        createdById: payload.userId,
        members: {
          create: [
            { userId: payload.userId, role: "ADMIN" },
            ...(memberIds || []).map((id) => ({
              userId: id,
              role: "MEMBER" as const,
            })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        _count: { select: { members: true, expenses: true } },
      },
    });

    await prisma.activity.create({
      data: {
        groupId: group.id,
        userId: payload.userId,
        type: "GROUP_CREATED",
        description: `Criou o grupo "${name}"`,
      },
    });

    res
      .status(201)
      .json({ ...group, membersCount: group._count.members, userBalance: 0 });
  } catch (error) {
    console.error("Create group error:", error);
    res.status(500).json({ error: "Erro ao criar grupo" });
  }
});

app.get("/api/groups/:id", async (req, res) => {
  const payload = getUserFromRequest(req);
  if (!payload) return res.status(401).json({ error: "Não autorizado" });

  try {
    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        expenses: {
          include: {
            paidBy: { select: { id: true, name: true, avatarUrl: true } },
            splits: { include: { user: { select: { id: true, name: true } } } },
          },
          orderBy: { date: "desc" },
        },
        _count: { select: { members: true, expenses: true } },
      },
    });

    if (!group) return res.status(404).json({ error: "Grupo não encontrado" });

    const isMember = group.members.some((m) => m.userId === payload.userId);
    if (!isMember)
      return res.status(403).json({ error: "Você não é membro deste grupo" });

    res.json({ ...group, membersCount: group._count.members });
  } catch (error) {
    console.error("Get group error:", error);
    res.status(500).json({ error: "Erro ao buscar grupo" });
  }
});

app.put("/api/groups/:id", async (req, res) => {
  const payload = getUserFromRequest(req);
  if (!payload) return res.status(401).json({ error: "Não autorizado" });

  try {
    const validation = updateGroupSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: validation.error.errors[0].message });
    }

    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId: req.params.id, userId: payload.userId },
      },
    });

    if (!membership || membership.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Apenas admins podem editar o grupo" });
    }

    const group = await prisma.group.update({
      where: { id: req.params.id },
      data: validation.data,
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        _count: { select: { members: true, expenses: true } },
      },
    });

    res.json({ ...group, membersCount: group._count.members });
  } catch (error) {
    console.error("Update group error:", error);
    res.status(500).json({ error: "Erro ao atualizar grupo" });
  }
});

app.delete("/api/groups/:id", async (req, res) => {
  const payload = getUserFromRequest(req);
  if (!payload) return res.status(401).json({ error: "Não autorizado" });

  try {
    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
    });
    if (!group) return res.status(404).json({ error: "Grupo não encontrado" });
    if (group.createdById !== payload.userId) {
      return res
        .status(403)
        .json({ error: "Apenas o criador pode excluir o grupo" });
    }

    await prisma.group.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete group error:", error);
    res.status(500).json({ error: "Erro ao excluir grupo" });
  }
});

app.post("/api/groups/join", async (req, res) => {
  const payload = getUserFromRequest(req);
  if (!payload) return res.status(401).json({ error: "Não autorizado" });

  try {
    const validation = joinGroupSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: validation.error.errors[0].message });
    }

    const group = await prisma.group.findUnique({
      where: { inviteCode: validation.data.inviteCode },
      include: { 
        members: true,
        creator: { select: { id: true, name: true } },
      },
    });

    if (!group) {
      return res.status(404).json({ error: "Código de convite inválido" });
    }

    const isAlreadyMember = group.members.some((m) => m.userId === payload.userId);
    if (isAlreadyMember) {
      return res.status(409).json({ error: "Você já é membro deste grupo" });
    }

    // Buscar informações do usuário que está entrando
    const joiningUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { name: true },
    });

    await prisma.groupMember.create({
      data: { groupId: group.id, userId: payload.userId, role: "MEMBER" },
    });

    await prisma.activity.create({
      data: {
        groupId: group.id,
        userId: payload.userId,
        type: "MEMBER_JOINED",
        description: "Entrou no grupo",
      },
    });

    // Enviar notificações para todos os membros existentes do grupo
    if (joiningUser) {
      await sendNotificationToGroup(
        group.id,
        payload.userId,
        "Novo membro no grupo",
        `${joiningUser.name} entrou no grupo ${group.name}`,
        { groupId: group.id, type: "MEMBER_JOINED" },
      );
    }

    res.json({ success: true, groupId: group.id });
  } catch (error) {
    console.error("Join group error:", error);
    res.status(500).json({ error: "Erro ao entrar no grupo" });
  }
});

// ===== GROUP SUB-ROUTES =====
// Simplifica saldos em lista de dívidas par a par (quem deve para quem)
function simplifyDebts(
  balances: {
    userId: string;
    userName: string;
    avatarUrl: string | null;
    amount: number;
  }[],
): {
  from: { id: string; name: string; avatarUrl: string | null };
  to: { id: string; name: string; avatarUrl: string | null };
  amount: number;
}[] {
  // Arredondar todos os saldos para 2 casas decimais antes de processar
  const roundedBalances = balances.map((b) => ({
    ...b,
    amount: Math.round(b.amount * 100) / 100,
  }));

  // Criar cópias para não mutar os objetos originais
  // Incluir valores >= 0.01 (maior ou igual a 1 centavo) para creditors
  const creditors = roundedBalances
    .filter((b) => b.amount >= 0.01) // Incluir valores de exatamente 0.01
    .map((b) => ({
      userId: b.userId,
      userName: b.userName,
      avatarUrl: b.avatarUrl,
      amount: Math.round(b.amount * 100) / 100,
    }))
    .sort((a, b) => b.amount - a.amount);
  // Incluir valores <= -0.01 (menor ou igual a -1 centavo) para debtors
  const debtors = roundedBalances
    .filter((b) => b.amount <= -0.01) // Incluir valores de exatamente -0.01
    .map((b) => ({
      userId: b.userId,
      userName: b.userName,
      avatarUrl: b.avatarUrl,
      amount: Math.round(Math.abs(b.amount) * 100) / 100,
    }))
    .sort((a, b) => b.amount - a.amount);

  const debts: {
    from: { id: string; name: string; avatarUrl: string | null };
    to: { id: string; name: string; avatarUrl: string | null };
    amount: number;
  }[] = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const cred = creditors[i];
    const deb = debtors[j];
    const rawAmount = Math.min(cred.amount, deb.amount);
    const amount = Math.round(rawAmount * 100) / 100; // Arredondar antes de usar

    // Permitir valores de pelo menos 0.01 (1 centavo)
    if (amount <= 0 || amount < 0.01) break;

    debts.push({
      from: { id: deb.userId, name: deb.userName, avatarUrl: deb.avatarUrl },
      to: { id: cred.userId, name: cred.userName, avatarUrl: cred.avatarUrl },
      amount: amount,
    });

    // Arredondar após subtração para evitar erros de ponto flutuante
    cred.amount = Math.round((cred.amount - amount) * 100) / 100;
    deb.amount = Math.round((deb.amount - amount) * 100) / 100;

    // Avançar quando o saldo restante for menor que 0.01 (menos de 1 centavo)
    if (cred.amount < 0.01) i++;
    if (deb.amount < 0.01) j++;
  }

  return debts;
}

app.get("/api/groups/:id/balances", async (req, res) => {
  const payload = getUserFromRequest(req);
  if (!payload) return res.status(401).json({ error: "Não autorizado" });

  try {
    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!group) return res.status(404).json({ error: "Grupo não encontrado" });

    const balanceList = await Promise.all(
      group.members.map(async (member) => ({
        userId: member.user.id,
        userName: member.user.name,
        avatarUrl: member.user.avatarUrl,
        amount: await calculateUserBalance(group.id, member.userId),
      })),
    );

    const totalSpentResult = await prisma.expense.aggregate({
      where: { groupId: group.id },
      _sum: { amount: true },
    });
    const totalSpent = Number(totalSpentResult._sum.amount ?? 0);
    const debts = simplifyDebts(balanceList);

    res.json({
      balances: balanceList,
      debts,
      totalSpent,
    });
  } catch (error) {
    console.error("Get balances error:", error);
    res.status(500).json({ error: "Erro ao buscar saldos" });
  }
});

app.get("/api/groups/:id/members", async (req, res) => {
  const payload = getUserFromRequest(req);
  if (!payload) return res.status(401).json({ error: "Não autorizado" });

  try {
    const members = await prisma.groupMember.findMany({
      where: { groupId: req.params.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
    res.json(members);
  } catch (error) {
    console.error("Get members error:", error);
    res.status(500).json({ error: "Erro ao buscar membros" });
  }
});

app.delete("/api/groups/:id/members", async (req, res) => {
  const payload = getUserFromRequest(req);
  if (!payload) return res.status(401).json({ error: "Não autorizado" });

  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "userId é obrigatório" });
    }

    // Verificar se o grupo existe
    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
      include: { 
        members: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }

    // Verificar se o usuário é membro do grupo
    const member = group.members.find((m) => m.userId === userId);
    if (!member) {
      return res
        .status(404)
        .json({ error: "Usuário não é membro deste grupo" });
    }

    // Buscar nome do usuário que está saindo
    const leavingUserName = member.user.name;

    // Verificar se o usuário está tentando sair do próprio grupo ou se é admin removendo outro membro
    // Por enquanto, permitir que qualquer membro saia do grupo
    // (você pode adicionar validações adicionais se necessário)

    // Remover o membro do grupo
    await prisma.groupMember.delete({
      where: {
        id: member.id,
      },
    });

    // Criar atividade
    await prisma.activity.create({
      data: {
        groupId: req.params.id,
        userId: payload.userId,
        type: "MEMBER_LEFT",
        description: "Saiu do grupo",
      },
    });

    // Enviar notificações para todos os membros restantes do grupo
    await sendNotificationToGroup(
      req.params.id,
      payload.userId,
      "Membro saiu do grupo",
      `${leavingUserName} saiu do grupo ${group.name}`,
      { groupId: req.params.id, type: "MEMBER_LEFT" },
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Remove member error:", error);
    res.status(500).json({ error: "Erro ao remover membro do grupo" });
  }
});

app.get("/api/groups/:id/invite", async (req, res) => {
  const payload = getUserFromRequest(req);
  if (!payload) return res.status(401).json({ error: "Não autorizado" });

  try {
    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
      select: { inviteCode: true, name: true },
    });
    if (!group) return res.status(404).json({ error: "Grupo não encontrado" });
    const inviteLink = `${PUBLIC_APP_URL}/invite/${group.inviteCode}`;
    res.json({
      inviteCode: group.inviteCode,
      inviteLink,
      groupName: group.name,
    });
  } catch (error) {
    console.error("Get invite error:", error);
    res.status(500).json({ error: "Erro ao buscar convite" });
  }
});

app.get("/api/groups/:id/expenses", async (req, res) => {
  const payload = getUserFromRequest(req);
  if (!payload) return res.status(401).json({ error: "Não autorizado" });

  try {
    const expenses = await prisma.expense.findMany({
      where: { groupId: req.params.id },
      include: {
        paidBy: { select: { id: true, name: true, avatarUrl: true } },
        splits: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { date: "desc" },
    });
    res.json(expenses);
  } catch (error) {
    console.error("Get expenses error:", error);
    res.status(500).json({ error: "Erro ao buscar despesas" });
  }
});

app.post("/api/groups/:id/expenses", async (req, res) => {
  const payload = getUserFromRequest(req);
  if (!payload) return res.status(401).json({ error: "Não autorizado" });

  try {
    const validation = createExpenseSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: validation.error.errors[0].message });
    }

    const { description, amount, paidById, category, splitType, splits, date } =
      validation.data;

    // Calcular splits com distribuição inteligente de centavos
    let calculatedSplits: Array<{ userId: string; amount: number; percentage?: number }>;
    
    if (splitType === "EQUAL") {
      // Distribuir igualmente, garantindo que a soma seja exatamente igual ao valor total
      const splitCount = splits.length;
      const baseAmount = Math.floor((amount * 100) / splitCount) / 100; // Valor base em centavos
      const remainder = Math.round((amount * 100) % splitCount); // Centavos restantes
      
      calculatedSplits = splits.map((s, index) => {
        // Os primeiros 'remainder' splits recebem 1 centavo extra
        const extraCent = index < remainder ? 0.01 : 0;
        const finalAmount = Math.round((baseAmount + extraCent) * 100) / 100;
        return {
          userId: s.userId,
          amount: finalAmount,
          percentage: s.percentage,
        };
      });
    } else {
      // Para outros tipos, usar os valores fornecidos ou calcular proporcionalmente
      calculatedSplits = splits.map((s) => ({
        userId: s.userId,
        amount: s.amount || amount / splits.length,
        percentage: s.percentage,
      }));
    }

    const expense = await prisma.expense.create({
      data: {
        groupId: req.params.id,
        paidById,
        amount,
        description,
        category,
        splitType,
        date: date ? new Date(date) : new Date(),
        splits: {
          create: calculatedSplits.map((s) => ({
            userId: s.userId,
            amount: s.amount,
            percentage: s.percentage,
          })),
        },
      },
      include: {
        paidBy: { select: { id: true, name: true, avatarUrl: true } },
        splits: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    await prisma.activity.create({
      data: {
        groupId: req.params.id,
        userId: payload.userId,
        type: "EXPENSE_ADDED",
        description: `Adicionou despesa "${description}" de R$ ${amount.toFixed(2)}`,
      },
    });

    // Enviar notificações para todos os membros do grupo (exceto quem criou)
    const amountFormatted = Number(amount).toFixed(2).replace(".", ",");
    await sendNotificationToGroup(
      req.params.id,
      payload.userId,
      "Nova despesa adicionada",
      `${expense.paidBy.name} adicionou "${description}" de R$ ${amountFormatted}`,
      { groupId: req.params.id, type: "EXPENSE_ADDED", expenseId: expense.id },
    );

    res.status(201).json(expense);
  } catch (error) {
    console.error("Create expense error:", error);
    res.status(500).json({ error: "Erro ao criar despesa" });
  }
});

app.get("/api/groups/:id/settlements", async (req, res) => {
  const payload = getUserFromRequest(req);
  if (!payload) return res.status(401).json({ error: "Não autorizado" });

  try {
    const settlements = await prisma.settlement.findMany({
      where: { groupId: req.params.id },
      include: {
        fromUser: { select: { id: true, name: true, avatarUrl: true } },
        toUser: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { settledAt: "desc" },
    });
    res.json(settlements);
  } catch (error) {
    console.error("Get settlements error:", error);
    res.status(500).json({ error: "Erro ao buscar acertos" });
  }
});

app.post("/api/groups/:id/settlements", async (req, res) => {
  const payload = getUserFromRequest(req);
  if (!payload) return res.status(401).json({ error: "Não autorizado" });

  try {
    const validation = createSettlementSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: validation.error.errors[0].message });
    }

    const { fromUserId, toUserId, amount, paymentMethod, note } =
      validation.data;

    // Validações
    if (fromUserId === toUserId) {
      return res
        .status(400)
        .json({ error: "Não é possível pagar para si mesmo" });
    }

    // Verificar se ambos são membros do grupo
    const members = await prisma.groupMember.findMany({
      where: {
        groupId: req.params.id,
        userId: { in: [fromUserId, toUserId] },
      },
    });

    if (members.length !== 2) {
      return res
        .status(400)
        .json({ error: "Ambos usuários devem ser membros do grupo" });
    }

    // Verificar quem está criando o settlement
    const isPayer = payload.userId === fromUserId;
    const isReceiver = payload.userId === toUserId;

    if (!isPayer && !isReceiver) {
      return res
        .status(403)
        .json({ error: "Você não pode criar este settlement" });
    }

    // Calcular saldo atual do pagador
    const currentBalance = await calculateUserBalance(
      req.params.id,
      fromUserId,
    );

    // Verificar se o pagador deve dinheiro (saldo negativo)
    if (currentBalance >= 0) {
      return res.status(400).json({
        error: `${isPayer ? "Você não deve dinheiro" : "Este usuário não deve dinheiro"} neste grupo`,
      });
    }

    // Arredondar saldo e valor do pagamento para evitar problemas de ponto flutuante
    const roundedBalance = Math.round(currentBalance * 100) / 100;
    const roundedAmount = Math.round(Number(amount) * 100) / 100;

    // Verificar se o valor do pagamento não excede o que é devido
    // Permitir pequena diferença de até 0.01 devido a arredondamentos
    const amountDue = Math.abs(roundedBalance);
    if (roundedAmount > amountDue + 0.01) {
      return res.status(400).json({
        error: `${isPayer ? "Você deve apenas" : "Este usuário deve apenas"} R$ ${amountDue.toFixed(2).replace(".", ",")}. O valor do pagamento não pode exceder esse valor.`,
      });
    }

    // Garantir que amount é um número válido e pelo menos 1 centavo
    if (isNaN(roundedAmount) || roundedAmount < 0.01) {
      return res.status(400).json({ error: "Valor do pagamento deve ser pelo menos R$ 0,01" });
    }

    // Usar o valor arredondado para o settlement
    const settlementAmount = roundedAmount;

    // Garantir que o valor do settlement não exceda o saldo devido (ajustar se necessário)
    const finalSettlementAmount = Math.min(settlementAmount, amountDue);

    const settlement = await prisma.settlement.create({
      data: {
        groupId: req.params.id,
        fromUserId,
        toUserId,
        amount: finalSettlementAmount,
        paymentMethod,
        note,
      },
      include: {
        fromUser: { select: { id: true, name: true, avatarUrl: true } },
        toUser: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    await prisma.activity.create({
      data: {
        groupId: req.params.id,
        userId: payload.userId,
        type: "SETTLEMENT_MADE",
        description: `Registrou acerto de R$ ${finalSettlementAmount.toFixed(2)}`,
      },
    });

    // Enviar notificações
    const amountFormatted = finalSettlementAmount.toFixed(2).replace(".", ",");
    await sendNotificationToUser(
      toUserId,
      "Você recebeu um pagamento!",
      `${settlement.fromUser.name} pagou R$ ${amountFormatted} para você`,
      { groupId: req.params.id, type: "SETTLEMENT_RECEIVED" },
    );

    await sendNotificationToGroup(
      req.params.id,
      payload.userId,
      "Novo pagamento no grupo",
      `${settlement.fromUser.name} pagou R$ ${amountFormatted} para ${settlement.toUser.name}`,
      { groupId: req.params.id, type: "SETTLEMENT_MADE" },
    );

    res.status(201).json(settlement);
  } catch (error) {
    console.error("Create settlement error:", error);
    res.status(500).json({ error: "Erro ao criar acerto" });
  }
});

// ===== NOTIFICATIONS =====
const EXPO_ACCESS_TOKEN = process.env.EXPO_ACCESS_TOKEN;

async function sendNotificationToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<void> {
  if (!EXPO_ACCESS_TOKEN) {
    console.warn("⚠️ EXPO_ACCESS_TOKEN não configurado, pulando notificação");
    return;
  }

  try {
    const tokens = await prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true, id: true },
    });

    if (tokens.length === 0) {
      console.log(`📱 Nenhum token encontrado para o usuário ${userId}`);
      return;
    }

    console.log(`📤 Enviando notificação para ${tokens.length} dispositivo(s) do usuário ${userId}`);

    const messages = tokens.map((t) => ({
      to: t.token,
      sound: "default",
      title,
      body,
      data: data || {},
    }));

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
        Authorization: `Bearer ${EXPO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro HTTP ao enviar notificação: ${response.status} - ${errorText}`);
      return;
    }

    // Parsear resposta JSON da API do Expo
    const responseData = await response.json();
    
    if (responseData.data) {
      let successCount = 0;
      let errorCount = 0;
      const invalidTokens: string[] = [];

      // Verificar status de cada notificação enviada
      for (let i = 0; i < responseData.data.length; i++) {
        const result = responseData.data[i];
        const token = tokens[i];

        if (result.status === "ok") {
          successCount++;
        } else {
          errorCount++;
          const error = result.details?.error;
          
          // Verificar erros específicos que indicam token inválido/expirado
          if (
            error === "DeviceNotRegistered" ||
            error === "InvalidCredentials" ||
            error === "MessageTooBig" ||
            (error && error.includes("Invalid"))
          ) {
            console.log(`🗑️ Token inválido/expirado detectado: ${token.token.substring(0, 20)}... (erro: ${error})`);
            invalidTokens.push(token.id);
          } else {
            console.warn(`⚠️ Erro ao enviar notificação para token ${token.token.substring(0, 20)}...: ${error || result.status}`);
          }
        }
      }

      // Remover tokens inválidos do banco de dados
      if (invalidTokens.length > 0) {
        try {
          await prisma.deviceToken.deleteMany({
            where: { id: { in: invalidTokens } },
          });
          console.log(`✅ Removidos ${invalidTokens.length} token(s) inválido(s) do banco de dados`);
        } catch (deleteError) {
          console.error(`❌ Erro ao remover tokens inválidos:`, deleteError);
        }
      }

      console.log(`✅ Notificação enviada: ${successCount} sucesso(s), ${errorCount} erro(s)`);
    } else {
      console.warn("⚠️ Resposta da API Expo não contém campo 'data'");
    }
  } catch (error) {
    console.error("❌ Erro ao enviar notificação:", error);
  }
}

async function sendNotificationToGroup(
  groupId: string,
  excludeUserId: string,
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<void> {
  try {
    const members = await prisma.groupMember.findMany({
      where: {
        groupId,
        userId: { not: excludeUserId },
      },
      select: { userId: true },
    });

    await Promise.all(
      members.map((member) =>
        sendNotificationToUser(member.userId, title, body, data),
      ),
    );
  } catch (error) {
    console.error("Erro ao enviar notificação para grupo:", error);
  }
}

app.post("/api/notifications/register", async (req, res) => {
  const payload = getUserFromRequest(req);
  if (!payload) return res.status(401).json({ error: "Não autorizado" });

  try {
    const { token, platform } = req.body;
    if (!token || !platform) {
      return res
        .status(400)
        .json({ error: "Token e platform são obrigatórios" });
    }

    await prisma.deviceToken.upsert({
      where: { token },
      update: { userId: payload.userId, platform, updatedAt: new Date() },
      create: {
        userId: payload.userId,
        token,
        platform,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Register token error:", error);
    res.status(500).json({ error: "Erro ao registrar token" });
  }
});

app.post("/api/notifications/unregister", async (req, res) => {
  const payload = getUserFromRequest(req);
  if (!payload) return res.status(401).json({ error: "Não autorizado" });

  try {
    const { token } = req.body;
    if (token) {
      await prisma.deviceToken.deleteMany({
        where: { userId: payload.userId, token },
      });
    } else {
      await prisma.deviceToken.deleteMany({
        where: { userId: payload.userId },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Unregister token error:", error);
    res.status(500).json({ error: "Erro ao remover token" });
  }
});

// ===== ACTIVITIES =====
app.get("/api/activities", async (req, res) => {
  const payload = getUserFromRequest(req);
  if (!payload) return res.status(401).json({ error: "Não autorizado" });

  try {
    const userGroups = await prisma.groupMember.findMany({
      where: { userId: payload.userId },
      select: { groupId: true },
    });

    const activities = await prisma.activity.findMany({
      where: { groupId: { in: userGroups.map((g) => g.groupId) } },
      include: {
        group: { select: { id: true, name: true, emoji: true } },
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json(activities);
  } catch (error) {
    console.error("List activities error:", error);
    res.status(500).json({ error: "Erro ao listar atividades" });
  }
});

// ===== USERS =====
app.get("/api/users/search", async (req, res) => {
  const payload = getUserFromRequest(req);
  if (!payload) return res.status(401).json({ error: "Não autorizado" });

  try {
    const query = req.query.q as string;
    if (!query || query.length < 2) {
      return res.json([]);
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
        NOT: { id: payload.userId },
      },
      select: { id: true, name: true, email: true, avatarUrl: true },
      take: 10,
    });

    res.json(users);
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
});

// ===== HEALTH CHECK =====
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.json({ message: "RachaMais API", status: "running" });
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
