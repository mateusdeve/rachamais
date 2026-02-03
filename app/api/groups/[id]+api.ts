import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { updateGroupSchema } from '@/lib/validations';
import { apiResponse, apiError, unauthorized, notFound, forbidden } from '@/lib/utils';

// GET /api/groups/:id - Detalhes do grupo
export async function GET(
  request: Request,
  { params }: { params?: Promise<{ id: string }> | { id: string } }
) {
  const payload = getUserFromRequest(request);
  
  if (!payload) {
    return unauthorized();
  }
  
  try {
    // Extrair ID da URL como fallback
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
    
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        expenses: {
          include: {
            paidBy: { select: { id: true, name: true, avatarUrl: true } },
            splits: { include: { user: { select: { id: true, name: true } } } },
          },
          orderBy: { date: 'desc' },
        },
        _count: { select: { members: true, expenses: true } },
      },
    });
    
    if (!group) {
      return notFound('Grupo não encontrado');
    }
    
    // Verificar se usuário é membro
    const isMember = group.members.some((m) => m.userId === payload.userId);
    if (!isMember) {
      return forbidden('Você não é membro deste grupo');
    }
    
    return apiResponse({
      ...group,
      membersCount: group._count.members,
    });
  } catch (error) {
    console.error('Get group error:', error);
    return apiError('Erro ao buscar grupo', 500);
  }
}

// PUT /api/groups/:id - Atualizar grupo
export async function PUT(
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
    const validation = updateGroupSchema.safeParse(body);
    
    if (!validation.success) {
      return apiError(validation.error.errors[0].message);
    }
    
    // Verificar se é admin
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: payload.userId } },
    });
    
    if (!membership || membership.role !== 'ADMIN') {
      return forbidden('Apenas admins podem editar o grupo');
    }
    
    const group = await prisma.group.update({
      where: { id: groupId },
      data: validation.data,
      include: {
        members: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
        _count: { select: { members: true, expenses: true } },
      },
    });
    
    return apiResponse({
      ...group,
      membersCount: group._count.members,
    });
  } catch (error) {
    console.error('Update group error:', error);
    return apiError('Erro ao atualizar grupo', 500);
  }
}

// DELETE /api/groups/:id - Excluir grupo
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
    
    // Verificar se é o criador
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });
    
    if (!group) {
      return notFound('Grupo não encontrado');
    }
    
    if (group.createdById !== payload.userId) {
      return forbidden('Apenas o criador pode excluir o grupo');
    }
    
    await prisma.group.delete({
      where: { id: groupId },
    });
    
    return apiResponse({ success: true });
  } catch (error) {
    console.error('Delete group error:', error);
    return apiError('Erro ao excluir grupo', 500);
  }
}
