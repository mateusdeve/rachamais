import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { apiResponse, unauthorized, notFound } from '@/lib/utils';

export async function GET(request: Request) {
  const payload = getUserFromRequest(request);
  
  if (!payload) {
    return unauthorized();
  }
  
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      pixKey: true,
      createdAt: true,
    },
  });
  
  if (!user) {
    return notFound('Usuário não encontrado');
  }
  
  return apiResponse(user);
}
