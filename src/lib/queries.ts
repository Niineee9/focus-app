import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api, type CategoryInput, type Completion } from "./api";
import { toISO } from "./dates";

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true } },
});

/** Fecha local de hoy; se actualiza sola si la app sigue abierta pasada la medianoche. */
export function useToday() {
  const [today, setToday] = useState(() => toISO(new Date()));
  useEffect(() => {
    const t = setInterval(() => setToday(toISO(new Date())), 60_000);
    return () => clearInterval(t);
  }, []);
  return today;
}

export const useStatus = (today: string) =>
  useQuery({ queryKey: ["status"], queryFn: () => api.status(today), staleTime: Infinity, retry: false });

export const useCategories = () => useQuery({ queryKey: ["categories"], queryFn: api.listCategories });

export const useCompletions = (from: string, to: string) =>
  useQuery({ queryKey: ["completions", from, to], queryFn: () => api.getCompletions(from, to) });

export const useStats = (today: string) =>
  useQuery({ queryKey: ["stats", today], queryFn: () => api.getStats(today) });

/** Marca/desmarca con actualización optimista: la ✕ aparece al instante. */
export function useToggle(today: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, date }: Completion) => api.toggleCompletion(categoryId, date, today),
    onMutate: async ({ categoryId, date }) => {
      await qc.cancelQueries({ queryKey: ["completions"] });
      const previous = qc.getQueriesData<Completion[]>({ queryKey: ["completions"] });
      qc.setQueriesData<Completion[]>({ queryKey: ["completions"] }, (list) => {
        if (!list) return list;
        const has = list.some((c) => c.categoryId === categoryId && c.date === date);
        return has
          ? list.filter((c) => !(c.categoryId === categoryId && c.date === date))
          : [...list, { categoryId, date }];
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => ctx?.previous.forEach(([key, data]) => qc.setQueryData(key, data)),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["completions"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useSaveCategory(today: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number | null; input: CategoryInput }) => {
      if (id === null) await api.createCategory(input, today);
      else await api.updateCategory(id, input);
    },
    onSuccess: () => qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "status" }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteCategory,
    onSuccess: () => qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "status" }),
  });
}
