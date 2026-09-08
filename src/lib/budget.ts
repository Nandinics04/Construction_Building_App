export const EXPENSE_CATEGORIES = [
  'Cement',
  'Steel',
  'Sand / aggregate',
  'Bricks / blocks',
  'Finishing',
  'Plumbing & electrical',
  'Labour',
  'Professional',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type Expense = {
  id: string;
  description: string;
  cost: number;
  category: ExpenseCategory | string;
  createdAt: number;
};

export function inr(amount: number) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function newExpenseId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeExpenses(raw: unknown): Expense[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const category =
      typeof row.category === 'string' && row.category.trim()
        ? row.category
        : 'Other';
    return {
      id: typeof row.id === 'string' ? row.id : `legacy-${index}`,
      description: String(row.description ?? ''),
      cost: Number(row.cost) || 0,
      category,
      createdAt: typeof row.createdAt === 'number' ? row.createdAt : Date.now(),
    };
  });
}

export function spendTotal(expenses: Expense[]) {
  return expenses.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
}

export function spendByCategory(expenses: Expense[]) {
  const totals = new Map<string, number>();
  for (const item of expenses) {
    const key = item.category || 'Other';
    totals.set(key, (totals.get(key) ?? 0) + item.cost);
  }
  return [...totals.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function budgetStatus(spent: number, budget: number) {
  if (!(budget > 0)) {
    return { pct: 0, remaining: 0, over: false, hasBudget: false };
  }
  const pct = Math.min(999, Math.round((spent / budget) * 100));
  const remaining = budget - spent;
  return { pct, remaining, over: remaining < 0, hasBudget: true };
}
