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

export interface Attachment {
  id: string;
  expense_id: string;
  file_path: string;
  original_name: string;
  mime_type: string;
  size: number;
  created_at: number;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  paid_by: string;
  split_type: string;
  notes: string | null;
  created_at: number;
  payer_name: string | null;
  payer_email: string;
  splits: ExpenseSplit[];
  attachments: Attachment[];
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
