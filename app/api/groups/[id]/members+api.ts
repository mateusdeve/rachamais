import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { apiResponse, apiError, unauthorized, forbidden } from '@/lib/utils';

// GET /api/groups/:id/members - Listar membros
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
    
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
    
    return apiResponse(members);
  } catch (error) {
    console.error('List members error:', error);
    return apiError('Erro ao listar membros', 500);
  }
}

// DELETE /api/groups/:id/members?userId=xxx - Remover membro
export async function DELETE(
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
    
    const url = new URL(request.url);
    const userIdToRemove = url.searchParams.get('userId');
    
    if (!userIdToRemove) {
      return apiError('userId é obrigatório');
    }
    
    // Verificar se quem está removendo é admin
    const requesterMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: payload.userId } },
    });
    
    // Pode remover se for admin ou se estiver removendo a si mesmo
    const canRemove = requesterMembership?.role === 'ADMIN' || payload.userId === userIdToRemove;
    
    if (!canRemove) {
      return forbidden('Sem permissão para remover este membro');
    }
    
    // Não pode remover o criador do grupo
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (group?.createdById === userIdToRemove) {
      return forbidden('Não é possível remover o criador do grupo');
    }
    
    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId: userIdToRemove } },
    });
    
    // Registrar atividade
    await prisma.activity.create({
      data: {
        groupId,
        userId: payload.userId,
        type: 'MEMBER_LEFT',
        description: 'Membro removido do grupo',
        metadata: { removedUserId: userIdToRemove },
      },
    });
    
    return apiResponse({ success: true });
  } catch (error) {
    console.error('Remove member error:', error);
    return apiError('Erro ao remover membro', 500);
  }
}
