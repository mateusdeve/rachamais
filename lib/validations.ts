import { z } from 'zod';

// Auth
export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

// Groups
export const createGroupSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  emoji: z.string().default('👥'),
  description: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1).optional(),
  emoji: z.string().optional(),
  description: z.string().optional(),
});

// Expenses
export const createExpenseSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().positive('Valor deve ser positivo'),
  paidById: z.string(),
  category: z.enum(['FOOD', 'TRANSPORT', 'ACCOMMODATION', 'ENTERTAINMENT', 'SHOPPING', 'UTILITIES', 'HEALTH', 'OTHER']).default('OTHER'),
  splitType: z.enum(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES']).default('EQUAL'),
  splits: z.array(z.object({
    userId: z.string(),
    amount: z.number().optional(),
    percentage: z.number().optional(),
  })),
  date: z.string().datetime().optional(),
});

// Settlements
export const createSettlementSchema = z.object({
  fromUserId: z.string(),
  toUserId: z.string(),
  amount: z.number().positive('Valor deve ser positivo'),
  paymentMethod: z.enum(['PIX', 'CASH', 'TRANSFER', 'CREDIT_CARD', 'OTHER']).default('PIX'),
  note: z.string().optional(),
});

// Invite
export const joinGroupSchema = z.object({
  inviteCode: z.string().min(1, 'Código é obrigatório'),
});
