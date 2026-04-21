export type AccountPayment = {
  id: string;
  amount: string;
  status: string;
  created_at: string;
  paypal_sale_id?: string | null;
};

export type AccountSubscription = {
  id: string;
  plan_category: string;
  plan_interval: string;
  status: string;
  amount: string;
  current_period_end: string | null;
  cancelled_at: string | null;
  payments: AccountPayment[];
  email?: string | null;
  discordRolePresent?: boolean | null;
  created_at?: string | null;
};
