import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { apiResponse, apiError, unauthorized, forbidden } from '@/lib/utils';

interface Balance {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  amount: number;
}

interface SimplifiedDebt {
  from: { id: string; name: string; avatarUrl: string | null };
  to: { id: string; name: string; avatarUrl: string | null };
  amount: number;
}

async function calculateMemberBalance(groupId: string, userId: string): Promise<number> {
  // Total que pagou
  const paid = await prisma.expense.aggregate({
    where: { groupId, paidById: userId },
    _sum: { amount: true },
  });
  
  // Total que deve (splits)
  const owed = await prisma.expenseSplit.aggregate({
    where: { expense: { groupId }, userId },
    _sum: { amount: true },
  });
  
  // Settlements recebidos
  const received = await prisma.settlement.aggregate({
    where: { groupId, toUserId: userId },
    _sum: { amount: true },
  });
  
  // Settlements pagos
  const settled = await prisma.settlement.aggregate({
    where: { groupId, fromUserId: userId },
    _sum: { amount: true },
  });
  
  const totalPaid = Number(paid._sum.amount || 0);
  const totalOwed = Number(owed._sum.amount || 0);
  const totalReceived = Number(received._sum.amount || 0);
  const totalSettled = Number(settled._sum.amount || 0);
  
  return totalPaid - totalOwed + totalReceived - totalSettled;
}

function simplifyDebts(balances: Balance[], members: any[]): SimplifiedDebt[] {
  const creditors: { userId: string; amount: number }[] = [];
  const debtors: { userId: string; amount: number }[] = [];
  
  balances.forEach((b) => {
    if (b.amount > 0.01) {
      creditors.push({ userId: b.userId, amount: b.amount });
    } else if (b.amount < -0.01) {
      debtors.push({ userId: b.userId, amount: Math.abs(b.amount) });
    }
  });
  
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);
  
  const debts: SimplifiedDebt[] = [];
  let i = 0, j = 0;
  
  while (i < creditors.length && j < debtors.length) {
    const amount = Math.min(creditors[i].amount, debtors[j].amount);
    
    if (amount > 0.01) {
      const fromMember = members.find((m) => m.userId === debtors[j].userId)?.user;
      const toMember = members.find((m) => m.userId === creditors[i].userId)?.user;
      
      if (fromMember && toMember) {
        debts.push({
          from: { id: fromMember.id, name: fromMember.name, avatarUrl: fromMember.avatarUrl },
          to: { id: toMember.id, name: toMember.name, avatarUrl: toMember.avatarUrl },
          amount: Math.round(amount * 100) / 100,
        });
      }
    }
    
    creditors[i].amount -= amount;
    debtors[j].amount -= amount;
    
    if (creditors[i].amount < 0.01) i++;
    if (debtors[j].amount < 0.01) j++;
  }
  
  return debts;
}

async function getTotalSpent(groupId: string): Promise<number> {
  const result = await prisma.expense.aggregate({
    where: { groupId },
    _sum: { amount: true },
  });
  return Number(result._sum.amount || 0);
}

// GET /api/groups/:id/balances - Calcular saldos e dívidas simplificadas
export async function GET(
  request: Request,
  { params }: { params?: Promise<{ id: string }> | { id: string } }
) {
  const payload = getUserFromRequest(request);
  
  if (!payload) {
    return unauthorized();
  }
  
  try {
    const urlPath = new URL(request.url).pathname;
    const pathParts = urlPath.split('/').filter(Boolean);
    const groupIdFromUrl = pathParts[pathParts.indexOf('groups') + 1];
    
    let groupId: string | undefined;
    
    if (params) {
      const resolvedParams = await Promise.resolve(params);
      groupId = resolvedParams?.id;
    }
    
    groupId = groupId || groupIdFromUrl;
    
    if (!groupId) {
      return apiError('ID do grupo é obrigatório', 400);
    }
    
    // Verificar se é membro
    const isMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: payload.userId } },
    });
    
    if (!isMember) {
      return forbidden('Você não é membro deste grupo');
    }
    
    // Buscar todos os membros
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
    
    // Calcular saldo de cada membro
    const balances: Balance[] = await Promise.all(
      members.map(async (member) => {
        const balance = await calculateMemberBalance(groupId, member.userId);
        return {
          userId: member.userId,
          userName: member.user.name,
          avatarUrl: member.user.avatarUrl,
          amount: balance,
        };
      })
    );
    
    // Simplificar dívidas
    const debts = simplifyDebts(balances, members);
    
    return apiResponse({
      balances,
      debts,
      totalSpent: await getTotalSpent(groupId),
    });
  } catch (error) {
    console.error('Get balances error:', error);
    return apiError('Erro ao calcular saldos', 500);
  }
}
