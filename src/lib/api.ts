import { invoke } from "@tauri-apps/api/core";

export interface ServerInfo {
  host: string;
  database: string;
  version: string;
}

export interface Status {
  configured: boolean;
  server: ServerInfo | null;
  error: string | null;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  daysMask: number;
  createdAt: string;
}

export interface CategoryInput {
  name: string;
  icon: string;
  color: string;
  daysMask: number;
}

export interface Completion {
  categoryId: number;
  date: string;
}

export type DayStatus = "done" | "missed" | "pending" | "off" | "extra" | "before" | "future";

export interface Progress {
  done: number;
  target: number;
}

export interface CategoryStats {
  categoryId: number;
  currentStreak: number;
  bestStreak: number;
  completionRate: number;
  scheduledDays: number;
  completedScheduled: number;
  extraCompletions: number;
  doneToday: boolean;
  scheduledToday: boolean;
  week: Progress;
  month: Progress;
  history: { date: string; status: DayStatus }[];
}

export interface Stats {
  today: string;
  overall: {
    perfectStreak: number;
    bestPerfectStreak: number;
    today: Progress;
    week: Progress;
    month: Progress;
    completionRate: number;
  };
  categories: CategoryStats[];
}

export const api = {
  status: (today: string) => invoke<Status>("status", { today }),
  connect: (url: string, today: string) => invoke<ServerInfo>("connect", { url, today }),
  disconnect: () => invoke<void>("disconnect"),
  listCategories: () => invoke<Category[]>("list_categories"),
  createCategory: (input: CategoryInput, today: string) =>
    invoke<Category>("create_category", { input, today }),
  updateCategory: (id: number, input: CategoryInput) => invoke<void>("update_category", { id, input }),
  deleteCategory: (id: number) => invoke<void>("delete_category", { id }),
  getCompletions: (from: string, to: string) => invoke<Completion[]>("get_completions", { from, to }),
  toggleCompletion: (categoryId: number, date: string, today: string) =>
    invoke<boolean>("toggle_completion", { categoryId, date, today }),
  getStats: (today: string) => invoke<Stats>("get_stats", { today }),
};
