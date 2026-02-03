import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { createSettlementSchema } from '@/lib/validations';
import { apiResponse, apiError, unauthorized, forbidden } from '@/lib/utils';
import { Decimal } from '@prisma/client/runtime/library';

// GET /api/groups/:id/settlements - Listar pagamentos
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
    
    const settlements = await prisma.settlement.findMany({
      where: { groupId },
      include: {
        fromUser: { select: { id: true, name: true, avatarUrl: true } },
        toUser: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { settledAt: 'desc' },
    });
    
    return apiResponse(settlements);
  } catch (error) {
    console.error('List settlements error:', error);
    return apiError('Erro ao listar pagamentos', 500);
  }
}

// POST /api/groups/:id/settlements - Registrar pagamento
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
    const validation = createSettlementSchema.safeParse(body);
    
    if (!validation.success) {
      return apiError(validation.error.errors[0].message);
    }
    
    const { fromUserId, toUserId, amount, paymentMethod, note } = validation.data;
    
    // Verificar se ambos são membros
    const members = await prisma.groupMember.findMany({
      where: {
        groupId,
        userId: { in: [fromUserId, toUserId] },
      },
    });
    
    if (members.length !== 2) {
      return forbidden('Ambos usuários devem ser membros do grupo');
    }
    
    const settlement = await prisma.settlement.create({
      data: {
        groupId,
        fromUserId,
        toUserId,
        amount: new Decimal(amount),
        paymentMethod,
        note,
      },
      include: {
        fromUser: { select: { id: true, name: true, avatarUrl: true } },
        toUser: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    
    // Registrar atividade
    await prisma.activity.create({
      data: {
        groupId,
        userId: payload.userId,
        type: 'SETTLEMENT_MADE',
        description: `${settlement.fromUser.name} pagou R$ ${amount.toFixed(2)} para ${settlement.toUser.name}`,
        metadata: { settlementId: settlement.id },
      },
    });
    
    return apiResponse(settlement, 201);
  } catch (error) {
    console.error('Create settlement error:', error);
    return apiError('Erro ao registrar pagamento', 500);
  }
}
