import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { apiResponse, apiError, unauthorized } from '@/lib/utils';

// GET /api/activities - Listar atividades do usuário
export async function GET(request: Request) {
  const payload = getUserFromRequest(request);
  
  if (!payload) {
    return unauthorized();
  }
  
  try {
    // Buscar todos os grupos que o usuário participa
    const userGroups = await prisma.groupMember.findMany({
      where: { userId: payload.userId },
      select: { groupId: true },
    });
    
    const groupIds = userGroups.map((gm) => gm.groupId);
    
    // Buscar todas as atividades desses grupos
    const activities = await prisma.activity.findMany({
      where: {
        groupId: { in: groupIds },
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            emoji: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limitar a 100 atividades mais recentes
    });
    
    return apiResponse(activities);
  } catch (error) {
    console.error('List activities error:', error);
    return apiError('Erro ao listar atividades', 500);
  }
}
