"use client";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError, type User } from "./api";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return (await api<{ user: User }>("/auth/me")).user;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Listing } from "./api";

// Ids of listings the logged-in user has saved.
export function useSavedIds() {
  const { data: me } = useMe();
  const q = useQuery({
    queryKey: ["saved"],
    enabled: Boolean(me),
    queryFn: async () => (await api<{ items: Listing[] }>("/listings/saved/mine")).items,
  });
  return { items: q.data, ids: new Set((q.data ?? []).map((l) => l.id)), isPending: q.isPending && Boolean(me), signedIn: Boolean(me) };
}

export function useToggleSaved() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, save }: { id: number; save: boolean }) => api(`/listings/${id}/favorite`, { method: save ? "PUT" : "DELETE" }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["saved"] }),
  });
}
