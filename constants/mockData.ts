import { User, Group, Member, Expense, Debt } from '@/types';

export const mockUser: User = {
  id: '1',
  name: 'João Silva',
  email: 'joao@email.com',
  avatarUrl: 'https://i.pravatar.cc/150?img=1',
};

export const mockGroups: Group[] = [
  {
    id: '1',
    name: 'Viagem Natal 2024',
    emoji: '🏖️',
    membersCount: 5,
    userBalance: 170.00,
  },
  {
    id: '2',
    name: 'Churrasco Fim de Ano',
    emoji: '🍖',
    membersCount: 8,
    userBalance: 50.00,
  },
  {
    id: '3',
    name: 'Viagem Praias',
    emoji: '✈️',
    membersCount: 4,
    userBalance: -30.00,
  },
  {
    id: '4',
    name: 'Futebol Quarta',
    emoji: '⚽',
    membersCount: 12,
    userBalance: 0,
  },
  {
    id: '5',
    name: 'Aluguel Republica',
    emoji: '🔑',
    membersCount: 3,
    userBalance: -150.00,
  },
  {
    id: '6',
    name: 'Presente da Mãe',
    emoji: '🎁',
    membersCount: 2,
    userBalance: 120.00,
  },
];

export const mockMembers: Member[] = [
  { id: '1', name: 'João Silva', avatarUrl: 'https://i.pravatar.cc/150?img=1', username: '@joao_s' },
  { id: '2', name: 'Pedro Santos', avatarUrl: 'https://i.pravatar.cc/150?img=2', username: '@pedro_s' },
  { id: '3', name: 'Ana Costa', avatarUrl: 'https://i.pravatar.cc/150?img=3', username: '@ana_c' },
  { id: '4', name: 'Lucas Oliveira', avatarUrl: 'https://i.pravatar.cc/150?img=4', username: '@lucas_o' },
  { id: '5', name: 'Maria Souza', avatarUrl: 'https://i.pravatar.cc/150?img=5', username: '@maria_s' },
  { id: '6', name: 'Alice Oliveira', avatarUrl: 'https://i.pravatar.cc/150?img=6', username: '@alice_o' },
  { id: '7', name: 'Bruno Santos', avatarUrl: 'https://i.pravatar.cc/150?img=7', username: '@bruno_s' },
  { id: '8', name: 'Carla Dias', avatarUrl: 'https://i.pravatar.cc/150?img=8', username: '@carla_d' },
  { id: '9', name: 'Daniel Lima', avatarUrl: 'https://i.pravatar.cc/150?img=9', username: '@dan_lima' },
  { id: '10', name: 'Ana Oliveira', avatarUrl: 'https://i.pravatar.cc/150?img=10', username: '@ana_o' },
  { id: '11', name: 'Lucas Silva', avatarUrl: 'https://i.pravatar.cc/150?img=11', username: '@lucas_s' },
  { id: '12', name: 'Mariana Costa', avatarUrl: 'https://i.pravatar.cc/150?img=12', username: '@mariana_c' },
  { id: '13', name: 'Maria Luíza', avatarUrl: 'https://i.pravatar.cc/150?img=13', username: '@maria_l' },
  { id: '14', name: 'Carlos Eduardo', avatarUrl: 'https://i.pravatar.cc/150?img=14', username: '@carlos_e' },
  { id: '15', name: 'Ricardo', avatarUrl: 'https://i.pravatar.cc/150?img=15', username: '@ricardo' },
];

export const mockExpenses: Expense[] = [
  {
    id: '1',
    description: 'Jantar de Boas-vindas',
    amount: 320.00,
    paidBy: mockMembers[0],
    date: '2024-12-20',
    splitCount: 4,
  },
  {
    id: '2',
    description: 'Uber Aeroporto',
    amount: 85.50,
    paidBy: mockMembers[14],
    date: '2024-12-19',
    splitCount: 4,
  },
  {
    id: '3',
    description: 'Mercado (Bebidas)',
    amount: 215.00,
    paidBy: mockMembers[2],
    date: '2024-12-19',
    splitCount: 4,
  },
  {
    id: '4',
    description: 'Reserva Hotel',
    amount: 3630.00,
    paidBy: mockMembers[0],
    date: '2024-12-18',
    splitCount: 4,
  },
];

export const mockDebts: Debt[] = [
  { from: mockMembers[13], to: mockMembers[0], amount: 45.00 },
  { from: mockMembers[0], to: mockMembers[14], amount: 20.00 },
  { from: mockMembers[10], to: mockMembers[2], amount: 15.50 },
];
