import { prisma } from '@/lib/prisma';
import { comparePassword, generateToken } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import { apiResponse, apiError, handlePrismaError } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);
    
    if (!validation.success) {
      return apiError(validation.error.errors[0].message);
    }
    
    const { email, password } = validation.data;
    
    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user) {
      return apiError('Email ou senha inválidos', 401);
    }
    
    // Verificar senha
    const isValidPassword = await comparePassword(password, user.password);
    
    if (!isValidPassword) {
      return apiError('Email ou senha inválidos', 401);
    }
    
    // Gerar token
    const token = generateToken({ userId: user.id, email: user.email });
    
    return apiResponse({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      token,
    });
  } catch (error) {
    return handlePrismaError(error);
  }
}
