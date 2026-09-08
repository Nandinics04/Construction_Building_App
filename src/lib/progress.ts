export const SITE_STAGES = [
  'Site clearing',
  'Foundation',
  'Plinth / basement',
  'Columns',
  'Slab',
  'Walls',
  'Roof',
  'Plumbing',
  'Electrical',
  'Plaster',
  'Flooring',
  'Painting',
  'Handover',
] as const;

export type ProgressTask = {
  id: string;
  description: string;
  date: string;
  imageUrl?: string;
  isCompleted: boolean;
  notes?: string;
  materials?: { name: string; quantity: string; unit: string }[];
};

export function withoutUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => withoutUndefined(item)) as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (nested === undefined) continue;
      out[key] = withoutUndefined(nested);
    }
    return out as T;
  }
  return value;
}

export function normalizeTasks(raw: unknown): ProgressTask[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const task: ProgressTask = {
      id: typeof row.id === 'string' ? row.id : `task-${index}`,
      description: String(row.description ?? ''),
      date: typeof row.date === 'string' ? row.date : new Date().toISOString().split('T')[0],
      isCompleted: Boolean(row.isCompleted),
    };
    if (typeof row.imageUrl === 'string' && row.imageUrl) task.imageUrl = row.imageUrl;
    if (typeof row.notes === 'string' && row.notes) task.notes = row.notes;
    return task;
  });
}

export function taskProgress(tasks: ProgressTask[]) {
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter((task) => task.isCompleted).length / tasks.length) * 100);
}

export function toFirestoreTask(task: ProgressTask) {
  const row: Record<string, string | boolean> = {
    id: task.id,
    description: task.description,
    date: task.date,
    isCompleted: Boolean(task.isCompleted),
  };
  if (task.imageUrl) row.imageUrl = task.imageUrl;
  if (task.notes) row.notes = task.notes;
  return row;
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function formatTaskDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
