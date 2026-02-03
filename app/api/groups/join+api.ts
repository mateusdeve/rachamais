import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { joinGroupSchema } from '@/lib/validations';
import { apiResponse, apiError, unauthorized, notFound } from '@/lib/utils';

// POST /api/groups/join - Entrar em grupo via código
export async function POST(request: Request) {
  const payload = getUserFromRequest(request);
  
  if (!payload) {
    return unauthorized();
  }
  
  try {
    const body = await request.json();
    const validation = joinGroupSchema.safeParse(body);
    
    if (!validation.success) {
      return apiError(validation.error.errors[0].message);
    }
    
    const { inviteCode } = validation.data;
    
    // Buscar grupo pelo código
    const group = await prisma.group.findUnique({
      where: { inviteCode },
      include: { members: true },
    });
    
    if (!group) {
      return notFound('Código de convite inválido');
    }
    
    // Verificar se já é membro
    const isAlreadyMember = group.members.some((m) => m.userId === payload.userId);
    if (isAlreadyMember) {
      return apiError('Você já é membro deste grupo', 409);
    }
    
    // Adicionar como membro
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: payload.userId,
        role: 'MEMBER',
      },
    });
    
    // Registrar atividade
    await prisma.activity.create({
      data: {
        groupId: group.id,
        userId: payload.userId,
        type: 'MEMBER_JOINED',
        description: 'Entrou no grupo',
      },
    });
    
    return apiResponse({ success: true, groupId: group.id });
  } catch (error) {
    console.error('Join group error:', error);
    return apiError('Erro ao entrar no grupo', 500);
  }
}
