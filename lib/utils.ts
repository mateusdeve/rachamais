import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function apiResponse<T>(data: T, status = 200) {
  return Response.json(data, { status });
}

export function apiError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function unauthorized(message = 'Não autorizado') {
  return apiError(message, 401);
}

export function notFound(message = 'Não encontrado') {
  return apiError(message, 404);
}

export function forbidden(message = 'Acesso negado') {
  return apiError(message, 403);
}

export function handlePrismaError(error: unknown): Response {
  console.error('Prisma error:', error);
  
  // Verificar se é erro de conexão com o banco de dados
  if (error instanceof Error) {
    if (error.message.includes('Can\'t reach database server') || 
        error.message.includes('P1001') ||
        error.message.includes('connection')) {
      return apiError('Erro de conexão com o banco de dados. Verifique se o servidor está acessível.', 503);
    }
    
    if (error.message.includes('Unique constraint') || error.message.includes('P2002')) {
      return apiError('Este registro já existe', 409);
    }
    
    if (error.message.includes('Record to update does not exist') || error.message.includes('P2025')) {
      return apiError('Registro não encontrado', 404);
    }
  }
  
  // Verificar se é erro do Prisma com código
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code?: string; message?: string };
    if (prismaError.code === 'P1001' || prismaError.message?.includes('Can\'t reach database server')) {
      return apiError('Erro de conexão com o banco de dados. Verifique se o servidor está acessível.', 503);
    }
  }
  
  return apiError('Erro interno do servidor', 500);
}
