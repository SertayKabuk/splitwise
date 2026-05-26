export interface Member {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  iban: string | null;
  joined_at: number;
  is_placeholder: boolean;
  claim_code: string | null;
  sponsored_by: string | null;
}

export interface ExpenseSplit {
  expense_id: string;
  user_id: string;
  amount: number;
  shares: number;
  name: string | null;
  email: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  paid_by: string;
  split_type: string;
  created_at: number;
  payer_name: string | null;
  payer_email: string;
  splits: ExpenseSplit[];
}

export interface Balance {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  currency: string;
}

export interface Settlement {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  currency: string;
  settledAt: number;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  view_code: string | null;
  created_by: string;
  created_at: number;
}
