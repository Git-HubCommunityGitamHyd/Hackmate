"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import type {
  PersonCardDTO,
  HackathonCardDTO,
  TeamCardDTO,
  TeamDetailDTO,
  ProfileDTO,
} from "@/lib/queries/types";

export type { PersonCardDTO, HackathonCardDTO, TeamCardDTO, TeamDetailDTO, ProfileDTO };

/* ------------------------------------------------------------------ */
/* Typed fetch helper                                                  */
/* ------------------------------------------------------------------ */

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function useApi<T>(
  key: unknown[],
  path: string | null,
  options?: Partial<UseQueryOptions<T>>,
) {
  return useQuery<T>({
    queryKey: key,
    queryFn: () => api<T>(path!),
    enabled: !!path,
    ...options,
  });
}

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

export function useCurrentUser() {
  const { data: session, status } = useSession();
  return {
    user: session?.user ?? null,
    loading: status === "loading",
    isAuthenticated: status === "authenticated",
  };
}

export function useMyProfile() {
  const { isAuthenticated } = useCurrentUser();
  return useApi<ProfileDTO>(["me"], isAuthenticated ? "/api/users/me" : null);
}

/* ------------------------------------------------------------------ */
/* Hackathons                                                          */
/* ------------------------------------------------------------------ */

export function useHackathons(params?: { q?: string; status?: string; mode?: string }) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.status) search.set("status", params.status);
  if (params?.mode) search.set("mode", params.mode);
  const qs = search.toString();
  return useApi<HackathonCardDTO[]>(["hackathons", qs], `/api/hackathons${qs ? `?${qs}` : ""}`);
}

export interface HackathonHubData {
  hackathon: HackathonCardDTO & {
    description: string | null;
    organizer: string | null;
    websiteUrl: string | null;
    collegeId: string | null;
    createdAt: string;
  };
  peopleLooking: PersonCardDTO[];
  teamsRecruiting: TeamCardDTO[];
  roleDemand: { role: string; count: number }[];
  myTeam: TeamCardDTO | null;
  viewerId: string | null;
}

export function useHackathonHub(idOrSlug: string | null) {
  return useApi<HackathonHubData>(["hackathon-hub", idOrSlug], idOrSlug ? `/api/hackathons/${idOrSlug}` : null);
}

/* ------------------------------------------------------------------ */
/* Teams                                                               */
/* ------------------------------------------------------------------ */

export function useTeams(filters?: { hackathonId?: string; recruiting?: boolean }) {
  const search = new URLSearchParams();
  if (filters?.hackathonId) search.set("hackathonId", filters.hackathonId);
  if (filters?.recruiting) search.set("recruiting", "true");
  const qs = search.toString();
  return useApi<TeamCardDTO[]>(["teams", qs], `/api/teams${qs ? `?${qs}` : ""}`);
}

export function useTeamDetail(id: string | null) {
  return useQuery<TeamDetailDTO & { recommendations?: PersonRecommendation[] }>({
    queryKey: ["team", id],
    queryFn: () => api(`/api/teams/${id}`),
    enabled: !!id,
  });
}

export interface PersonRecommendation {
  person: PersonCardDTO;
  rec: {
    userId: string;
    name: string;
    matchScore: number;
    topSkills: string[];
    availableAllThrough: boolean;
    emergencyAvailable: boolean;
    why: string;
  };
}

export function useInvalidateTeam(id?: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["team", id] });
    qc.invalidateQueries({ queryKey: ["teams"] });
    qc.invalidateQueries({ queryKey: ["hackathon-hub"] });
    qc.invalidateQueries({ queryKey: ["my-team"] });
  };
}

export function useJoinTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, message, roleSlug }: { teamId: string; message: string; roleSlug?: string }) =>
      api(`/api/teams/${teamId}/requests`, { method: "POST", body: JSON.stringify({ message, roleSlug }) }),
    onSuccess: () => {
      toast.success("Join request sent!", { description: "The team leads were notified." });
      qc.invalidateQueries();
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

/* ------------------------------------------------------------------ */
/* People / profiles                                                   */
/* ------------------------------------------------------------------ */

export function usePeople(params?: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v) search.set(k, v);
  }
  const qs = search.toString();
  return useApi<PersonCardDTO[]>(["people", qs], `/api/users${qs ? `?${qs}` : ""}`);
}

export function useProfile(id: string | null) {
  return useApi<ProfileDTO>(["profile", id], id ? `/api/users/${id}` : null);
}

/* ------------------------------------------------------------------ */
/* Chat (Pusher when configured, polling fallback otherwise)           */
/* ------------------------------------------------------------------ */

export interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  userName: string;
  userImage: string | null;
}

export function useTeamChat(teamId: string | null) {
  return useQuery<ChatMessage[]>({
    queryKey: ["chat", teamId],
    queryFn: () => api(`/api/teams/${teamId}/chat`),
    enabled: !!teamId,
    // Polling fallback when Pusher env is absent; Pusher pushes
    // cache updates in TeamChat component when configured.
    refetchInterval: process.env.NEXT_PUBLIC_PUSHER_KEY ? false : 4000,
  });
}

export function useSendMessage(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      api<ChatMessage>(`/api/teams/${teamId}/chat`, { method: "POST", body: JSON.stringify({ content }) }),
    onSuccess: (msg: ChatMessage) => {
      qc.setQueryData<ChatMessage[]>(["chat", teamId], (old) =>
        old ? [...old.filter((m) => m.id !== msg.id), msg] : [msg],
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

/* ------------------------------------------------------------------ */
/* Notifications / bookmarks / emergency                               */
/* ------------------------------------------------------------------ */

export interface NotificationsData {
  notifications: {
    id: string;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
    read: boolean;
    createdAt: string;
  }[];
  invites: {
    id: string;
    teamId: string;
    teamName: string;
    hackathonName: string;
    inviterName: string;
    message: string | null;
    createdAt: string;
  }[];
  myRequests: {
    id: string;
    teamId: string;
    teamName: string;
    hackathonName: string;
    message: string | null;
    createdAt: string;
  }[];
  incomingRequests: {
    id: string;
    teamId: string;
    teamName: string;
    userName: string;
    userImage: string | null;
    userBio: string | null;
    userId: string;
    message: string;
    createdAt: string;
  }[];
}

export function useNotifications(enabled: boolean) {
  return useQuery<NotificationsData>({
    queryKey: ["notifications"],
    queryFn: () => api("/api/notifications"),
    enabled,
    refetchInterval: 30_000,
  });
}

export function useBookmarks(enabled: boolean) {
  return useApi<{
    teams: TeamDetailDTO[];
    people: ProfileDTO[];
    hackathons: HackathonCardDTO[];
  }>(["bookmarks"], enabled ? "/api/bookmarks" : null);
}

export function useToggleBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ targetType, targetId }: { targetType: string; targetId: string }) =>
      api<{ bookmarked: boolean }>("/api/bookmarks", { method: "POST", body: JSON.stringify({ targetType, targetId }) }),
    onSuccess: (data: { bookmarked: boolean }) => {
      toast.success(data.bookmarked ? "Saved to bookmarks" : "Removed from bookmarks");
      qc.invalidateQueries({ queryKey: ["bookmarks"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSearch(q: string) {
  return useQuery({
    queryKey: ["search", q],
    queryFn: () =>
      api<{
        parsed: {
          intent: string;
          skills: string[];
          roles: string[];
          teamSize: number | null;
          terms: string[];
        } | null;
        hackathons: HackathonCardDTO[];
        teams: TeamCardDTO[];
        people: PersonCardDTO[];
      }>(`/api/search?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length >= 2,
    staleTime: 60_000,
  });
}

export function useMyTeam() {
  const { data: profile, isLoading } = useMyProfile();
  const myTeam =
    (profile as (ProfileDTO & { myTeam?: TeamDetailDTO | null }) | undefined)?.myTeam ?? null;
  return { data: myTeam, isLoading };
}
