export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  membersCount: number;
  userBalance: number;
}

export interface Member {
  id: string;
  name: string;
  avatarUrl?: string;
  username?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: Member;
  date: string;
  splitCount: number;
}

export interface Debt {
  from: Member;
  to: Member;
  amount: number;
}
