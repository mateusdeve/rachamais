import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { createGroupSchema } from '@/lib/validations';
import { apiResponse, apiError, unauthorized } from '@/lib/utils';

// Função auxiliar para calcular saldo
async function calculateUserBalance(groupId: string, userId: string): Promise<number> {
  // Total que o usuário pagou
  const paidExpenses = await prisma.expense.aggregate({
    where: { groupId, paidById: userId },
    _sum: { amount: true },
  });
  const totalPaid = Number(paidExpenses._sum.amount || 0);
  
  // Total que o usuário deve (sua parte nas despesas)
  const userSplits = await prisma.expenseSplit.aggregate({
    where: { expense: { groupId }, userId },
    _sum: { amount: true },
  });
  const totalOwed = Number(userSplits._sum.amount || 0);
  
  // Settlements recebidos
  const received = await prisma.settlement.aggregate({
    where: { groupId, toUserId: userId },
    _sum: { amount: true },
  });
  const totalReceived = Number(received._sum.amount || 0);
  
  // Settlements pagos
  const paid = await prisma.settlement.aggregate({
    where: { groupId, fromUserId: userId },
    _sum: { amount: true },
  });
  const totalSettlementPaid = Number(paid._sum.amount || 0);
  
  // Saldo = (pagou + recebeu) - (deve + pagou settlements)
  return totalPaid + totalReceived - totalOwed - totalSettlementPaid;
}

// GET /api/groups - Listar grupos do usuário
export async function GET(request: Request) {
  const payload = getUserFromRequest(request);
  
  if (!payload) {
    return unauthorized();
  }
  
  try {
    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: { userId: payload.userId },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
        _count: { select: { members: true, expenses: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    
    // Calcular saldo do usuário em cada grupo
    const groupsWithBalance = await Promise.all(
      groups.map(async (group) => {
        const balance = await calculateUserBalance(group.id, payload.userId);
        return {
          ...group,
          membersCount: group._count.members,
          userBalance: balance,
        };
      })
    );
    
    return apiResponse(groupsWithBalance);
  } catch (error) {
    console.error('List groups error:', error);
    return apiError('Erro ao listar grupos', 500);
  }
}

// POST /api/groups - Criar novo grupo
export async function POST(request: Request) {
  const payload = getUserFromRequest(request);
  
  if (!payload) {
    return unauthorized();
  }
  
  try {
    const body = await request.json();
    const validation = createGroupSchema.safeParse(body);
    
    if (!validation.success) {
      return apiError(validation.error.errors[0].message);
    }
    
    const { name, emoji, description, memberIds } = validation.data;
    
    const group = await prisma.group.create({
      data: {
        name,
        emoji: emoji || '👥',
        description,
        createdById: payload.userId,
        members: {
          create: [
            { userId: payload.userId, role: 'ADMIN' },
            ...(memberIds || []).map((id) => ({ userId: id, role: 'MEMBER' as const })),
          ],
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
        _count: { select: { members: true, expenses: true } },
      },
    });
    
    // Registrar atividade
    await prisma.activity.create({
      data: {
        groupId: group.id,
        userId: payload.userId,
        type: 'GROUP_CREATED',
        description: `Criou o grupo "${name}"`,
      },
    });
    
    return apiResponse({
      ...group,
      membersCount: group._count.members,
      userBalance: 0,
    }, 201);
  } catch (error) {
    console.error('Create group error:', error);
    return apiError('Erro ao criar grupo', 500);
  }
}
