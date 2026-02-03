import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { createExpenseSchema } from '@/lib/validations';
import { apiResponse, apiError, unauthorized, forbidden } from '@/lib/utils';
import { Decimal } from '@prisma/client/runtime/library';

// GET /api/groups/:id/expenses - Listar despesas do grupo
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
    
    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: {
        paidBy: { select: { id: true, name: true, avatarUrl: true } },
        splits: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
      orderBy: { date: 'desc' },
    });
    
    return apiResponse(expenses);
  } catch (error) {
    console.error('List expenses error:', error);
    return apiError('Erro ao listar despesas', 500);
  }
}

// POST /api/groups/:id/expenses - Criar despesa
export async function POST(
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
    
    const body = await request.json();
    const validation = createExpenseSchema.safeParse(body);
    
    if (!validation.success) {
      return apiError(validation.error.errors[0].message);
    }
    
    const { description, amount, paidById, category, splitType, splits, date } = validation.data;
    
    // Verificar se é membro
    const isMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: payload.userId } },
    });
    
    if (!isMember) {
      return forbidden('Você não é membro deste grupo');
    }
    
    // Calcular splits se for divisão igual
    let calculatedSplits = splits;
    if (splitType === 'EQUAL') {
      const splitAmount = amount / splits.length;
      calculatedSplits = splits.map((s) => ({
        ...s,
        amount: Math.round(splitAmount * 100) / 100,
      }));
    }
    
    // Criar despesa com splits
    const expense = await prisma.expense.create({
      data: {
        groupId,
        paidById,
        amount: new Decimal(amount),
        description,
        category,
        splitType,
        date: date ? new Date(date) : new Date(),
        splits: {
          create: calculatedSplits.map((s) => ({
            userId: s.userId,
            amount: new Decimal(s.amount || 0),
            percentage: s.percentage ? new Decimal(s.percentage) : null,
          })),
        },
      },
      include: {
        paidBy: { select: { id: true, name: true, avatarUrl: true } },
        splits: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });
    
    // Registrar atividade
    await prisma.activity.create({
      data: {
        groupId,
        userId: payload.userId,
        type: 'EXPENSE_ADDED',
        description: `Adicionou despesa "${description}" de R$ ${amount.toFixed(2)}`,
        metadata: { expenseId: expense.id },
      },
    });
    
    return apiResponse(expense, 201);
  } catch (error) {
    console.error('Create expense error:', error);
    return apiError('Erro ao criar despesa', 500);
  }
}
