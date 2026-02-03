import { prisma } from '@/lib/prisma';
import { hashPassword, generateToken } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';
import { apiResponse, apiError } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);
    
    if (!validation.success) {
      return apiError(validation.error.errors[0].message);
    }
    
    const { name, email, password } = validation.data;
    
    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return apiError('Email já cadastrado', 409);
    }
    
    // Criar usuário
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    
    // Gerar token
    const token = generateToken({ userId: user.id, email: user.email });
    
    return apiResponse({ user, token }, 201);
  } catch (error) {
    console.error('Register error:', error);
    return apiError('Erro interno do servidor', 500);
  }
}
