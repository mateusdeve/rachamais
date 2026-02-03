import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { apiResponse, apiError, unauthorized, notFound } from '@/lib/utils';

// GET /api/groups/:id/invite - Obter código de convite
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
    
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { inviteCode: true, name: true },
    });
    
    if (!group) {
      return notFound('Grupo não encontrado');
    }
    
    // Gerar link de deep linking
    // Formato: rachamais://invite/[inviteCode]
    const inviteLink = `rachamais://invite/${group.inviteCode}`;
    
    return apiResponse({
      inviteCode: group.inviteCode,
      inviteLink,
      groupName: group.name,
    });
  } catch (error) {
    console.error('Get invite code error:', error);
    return apiResponse({ error: 'Erro ao obter código de convite' }, 500);
  }
}
