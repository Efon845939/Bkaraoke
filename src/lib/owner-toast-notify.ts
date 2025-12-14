"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ToastProps } from "@/hooks/use-toast";

/**
 * Owner panelde yeni şarkı isteği gelince toast gösterir.
 * - Ücretsiz: Functions/Blaze gerekmez.
 * - Sadece owner rolündeyken çalışır.
 * - Spam önlemek için localStorage ile son gösterileni tutar.
 */
export function useOwnerSongRequestToast(opts: {
  role: "admin" | "owner" | null;
  songs: Array<any> | null | undefined;
  toast: (p: ToastProps) => void;
}) {
  const { role, songs, toast } = opts;

  const lastShownIdRef = useRef<string | null>(null);

  const newest = useMemo(() => {
    if (!songs || songs.length === 0) return null;

    const withDate = songs
      .map((s) => {
        const dt = s?.createdAt?.toDate?.() ?? s?.createdAt ?? null;
        const ms =
          dt instanceof Date ? dt.getTime() : typeof dt === "number" ? dt : 0;
        return { s, ms };
      })
      .sort((a, b) => b.ms - a.ms);

    return withDate[0]?.s ?? null;
  }, [songs]);

  useEffect(() => {
    if (role !== "owner") return;
    if (!newest) return;

    const id = newest.id ?? newest._id ?? null;
    if (!id) return;

    const key = "bkaroake:last_song_request_id";
    const last = localStorage.getItem(key);

    if (lastShownIdRef.current === null) {
      lastShownIdRef.current = last;
    }

    if (lastShownIdRef.current === id || last === id) return;

    const studentName = newest.studentName ?? "Biri";
    const songTitle = newest.songTitle ?? "Bilinmeyen Şarkı";

    toast({
      title: "Yeni İstek",
      description: `${studentName} — ${songTitle}`,
    });

    localStorage.setItem(key, id);
    lastShownIdRef.current = id;
  }, [role, newest, toast]);
}
