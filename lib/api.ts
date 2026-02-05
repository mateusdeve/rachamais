import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL da API
const getBaseURL = () => {
  // Usar a variável de ambiente se definida
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Para desenvolvimento web: usar window.location.origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Fallback para desenvolvimento local (porta do servidor backend)
  return 'http://localhost:3001';
};

const API_BASE_URL = getBaseURL();
console.log(`[API] URL base da API configurada: ${API_BASE_URL}`);

// Tipos para as respostas da API
export interface ApiError {
  error: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  token: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  pixKey?: string | null;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  description?: string | null;
  inviteCode: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  membersCount: number;
  userBalance: number;
  members?: GroupMember[];
  expenses?: Expense[];
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string | null;
  };
}

export interface Expense {
  id: string;
  groupId: string;
  paidById: string;
  amount: number;
  description: string;
  category: string;
  splitType: string;
  date: string;
  createdAt: string;
  paidBy: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
  splits?: ExpenseSplit[];
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  amount: number;
  percentage?: number | null;
  user: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
}

export interface Balance {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  amount: number;
}

export interface SimplifiedDebt {
  from: { id: string; name: string; avatarUrl: string | null };
  to: { id: string; name: string; avatarUrl: string | null };
  amount: number;
}

export interface BalancesResponse {
  balances: Balance[];
  debts: SimplifiedDebt[];
  totalSpent: number;
}

export interface Settlement {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  paymentMethod: string;
  note?: string | null;
  settledAt: string;
  createdAt: string;
  fromUser: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
  toUser: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
}

export interface InviteResponse {
  inviteCode: string;
  inviteLink?: string;
  groupName?: string;
}

// Cliente API base
async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await AsyncStorage.getItem('auth_token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Adicionar headers customizados se existirem
  if (options.headers) {
    Object.assign(headers, options.headers as Record<string, string>);
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_BASE_URL}${endpoint}`;

  console.log(`[API] Fazendo requisição para: ${url}`);
  console.log(`[API] Método: ${options.method || 'GET'}`);
  if (options.body) {
    console.log(`[API] Body: ${options.body}`);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log(`[API] Resposta recebida - Status: ${response.status}`);
    
    const data = await response.json();
    console.log(`[API] Dados recebidos:`, JSON.stringify(data).substring(0, 200));

    // Tratar erros de autenticação
    if (response.status === 401) {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      throw new Error('Não autorizado');
    }

    if (!response.ok) {
      const errorMessage = (data as ApiError).error || 'Erro ao processar requisição';
      console.error(`[API] Erro na resposta:`, errorMessage);
      throw new Error(errorMessage);
    }

    return data as T;
  } catch (error) {
    console.error(`[API] Erro na requisição:`, error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro de conexão');
  }
}

// API de Autenticação
export const auth = {
  register: async (data: { name: string; email: string; password: string }) => {
    return apiClient<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  login: async (data: { email: string; password: string }) => {
    return apiClient<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  me: async () => {
    return apiClient<User>('/api/auth/me');
  },
};

// API de Grupos
export const groups = {
  list: async () => {
    return apiClient<Group[]>('/api/groups');
  },

  create: async (data: { name: string; emoji?: string; description?: string; memberIds?: string[] }) => {
    return apiClient<Group>('/api/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  get: async (id: string) => {
    return apiClient<Group>(`/api/groups/${id}`);
  },

  update: async (id: string, data: { name?: string; emoji?: string; description?: string }) => {
    return apiClient<Group>(`/api/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiClient<{ success: boolean }>(`/api/groups/${id}`, {
      method: 'DELETE',
    });
  },

  join: async (inviteCode: string) => {
    return apiClient<{ success: boolean; groupId: string }>('/api/groups/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    });
  },
};

// API de Despesas
export const expenses = {
  list: async (groupId: string) => {
    return apiClient<Expense[]>(`/api/groups/${groupId}/expenses`);
  },

  create: async (groupId: string, data: {
    description: string;
    amount: number;
    paidById: string;
    category?: string;
    splitType?: string;
    splits: Array<{ userId: string; amount?: number; percentage?: number }>;
    date?: string;
  }) => {
    return apiClient<Expense>(`/api/groups/${groupId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// API de Saldos
export const balances = {
  get: async (groupId: string) => {
    return apiClient<BalancesResponse>(`/api/groups/${groupId}/balances`);
  },
};

// API de Pagamentos
export const settlements = {
  list: async (groupId: string) => {
    return apiClient<Settlement[]>(`/api/groups/${groupId}/settlements`);
  },

  create: async (groupId: string, data: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    paymentMethod?: string;
    note?: string;
  }) => {
    return apiClient<Settlement>(`/api/groups/${groupId}/settlements`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// API de Membros
export const members = {
  list: async (groupId: string) => {
    return apiClient<GroupMember[]>(`/api/groups/${groupId}/members`);
  },

  remove: async (groupId: string, userId: string) => {
    return apiClient<{ success: boolean }>(`/api/groups/${groupId}/members?userId=${userId}`, {
      method: 'DELETE',
    });
  },
};

// API de Convite
export const invite = {
  get: async (groupId: string) => {
    return apiClient<InviteResponse>(`/api/groups/${groupId}/invite`);
  },
};

// API de Usuários
export const users = {
  search: async (query: string) => {
    return apiClient<User[]>(`/api/users/search?q=${encodeURIComponent(query)}`);
  },
};

// API de Atividades
export interface Activity {
  id: string;
  groupId: string;
  userId: string;
  type: string;
  description: string;
  metadata?: any;
  createdAt: string;
  group: {
    id: string;
    name: string;
    emoji: string;
  };
  user: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
}

export const activities = {
  list: async () => {
    return apiClient<Activity[]>('/api/activities');
  },
};