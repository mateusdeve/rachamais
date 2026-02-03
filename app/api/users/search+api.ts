import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { apiResponse, apiError, unauthorized } from '@/lib/utils';

// GET /api/users/search?q=termo - Buscar usuários por nome ou email
export async function GET(request: Request) {
  const payload = getUserFromRequest(request);
  
  if (!payload) {
    return unauthorized();
  }
  
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    
    if (!query || query.length < 2) {
      return apiError('Busca deve ter pelo menos 2 caracteres');
    }
    
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: payload.userId } }, // Excluir o próprio usuário
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
      take: 10,
    });
    
    return apiResponse(users);
  } catch (error) {
    console.error('Search users error:', error);
    return apiError('Erro ao buscar usuários', 500);
  }
}
