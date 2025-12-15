"use client";

import { useState, useEffect, useMemo } from "react";
import VHSStage from "@/components/VHSStage";
import Link from "next/link";
import { Mic, Music } from "lucide-react";
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type Song = {
  id: string;
  studentName: string;
  songTitle: string;
  karaokeLink: string;
  status: "pending" | "approved" | "rejected";
  createdAt: any;
};

function KaraokePage() {
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [songTitle, setTitle] = useState("");
  const [songUrl, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  const { firestore, auth } = useFirebase();
  const { user, isUserLoading } = useUser();

  const songRequestsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "song_requests");
  }, [firestore]);

  const { data: songs, isLoading: songsLoading } =
    useCollection<Song>(songRequestsQuery);

  const approvedSongs = useMemo(() => {
    if (!songs) return [];
    return songs.filter((s) => s.status === "approved");
  }, [songs]);

  useEffect(() => {
    setIsClient(true);
    if (!isUserLoading && !user && auth) {
      signInAnonymously(auth).catch(() => {
        setErr("Kimlik doğrulama başarısız.");
      });
    }
  }, [isUserLoading, user, auth]);

  const cap = (s: string) =>
    s.trim().replace(/\b\w/g, (c) => c.toUpperCase());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!firestore || !auth || !user) return;

    setBusy(true);
    try {
      await addDoc(collection(firestore, "song_requests"), {
        studentName: `${cap(firstName)} ${cap(lastName)}`.trim(),
        songTitle: cap(songTitle),
        karaokeLink: songUrl.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
        studentId: user.uid,
      });

      setFirst("");
      setLast("");
      setTitle("");
      setUrl("");
      alert("Şarkı isteğiniz eklendi.");
    } finally {
      setBusy(false);
    }
  }

  if (!isClient) return null;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <header className="mx-auto mt-6 w-[min(1100px,92%)]">
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-4 py-4">

          <div className="flex w-full items-center justify-between">

            {/* 🔥 PSEUDO-LOGO → TIKLANABİLİR */}
            <Link
              href="/"
              aria-label="Ana sayfaya dön"
              className="flex items-center gap-3 select-none hover:opacity-90 transition"
            >
              <Mic className="text-neutral-400 size-7" />

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                <span className="text-neutral-400">B</span>
                Kara
                <span className="text-red-500">90</span>
                ke
              </h1>
            </Link>

            <Link
              href="/admin"
              className="rounded-2xl bg-white text-black px-4 py-2 text-sm font-semibold shadow"
            >
              Yönetici Paneli
            </Link>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-300">
                <Music className="mr-2 h-4 w-4" /> 90'lar Repertuvarımız
              </Button>
            </SheetTrigger>

            <SheetContent side="bottom" className="bg-black/80 text-white">
              <SheetHeader>
                <SheetTitle className="text-2xl font-black text-fuchsia-300">
                  Repertuvarımız
                </SheetTitle>
                <SheetDescription className="text-neutral-400">
                  Onaylanmış şarkılar
                </SheetDescription>
              </SheetHeader>

              <div className="grid gap-3 py-4 max-h-[60vh] overflow-y-auto">
                {songsLoading ? (
                  <p>Yükleniyor...</p>
                ) : approvedSongs.length ? (
                  approvedSongs.map((song) => (
                    <div key={song.id} className="border rounded-xl p-3">
                      <p className="font-bold">{song.songTitle}</p>
                      <a
                        href={song.karaokeLink}
                        target="_blank"
                        className="text-sm text-fuchsia-300"
                      >
                        {song.karaokeLink}
                      </a>
                    </div>
                  ))
                ) : (
                  <p>Henüz yok.</p>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="grid place-items-center py-8">
        <form onSubmit={submit} className="flex flex-col gap-4">
          {/* form aynen */}
        </form>
      </main>

      <VHSStage intensity={0.1} sfxVolume={0.35} />
    </div>
  );
}

export default function Page() {
  return <KaraokePage />;
}
