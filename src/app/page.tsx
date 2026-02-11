"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signInAnonymously } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { useCollection, useFirebase, useMemoFirebase, useUser } from "@/firebase";
import { MicVocal, Trophy, Heart, Disc } from "lucide-react";
import VhsOverlay from "@/components/VHSStage";
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
  songLink?: string | null;
  karaokeLink: string;
  status: "pending" | "approved" | "rejected";
  category?: "90lar" | "sevgililer";
  createdAt?: any;
  studentId?: string;
};

function normalizeText(s: string) {
  return (s || "").replace(/\s+/g, " ").trim();
}

function isProbablyUrl(s: string) {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

export default function Page() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [songUrl, setSongUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const { firestore, auth } = useFirebase();
  const { user, isUserLoading } = useUser();

  const songRequestsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "song_requests");
  }, [firestore]);

  const { data: songs, isLoading } = useCollection<Song>(songRequestsQuery);

  const approvedSongs90s = useMemo(() => {
    if (!songs) return [];
    return songs.filter((s) => s.status === "approved" && (!s.category || s.category === "90lar"));
  }, [songs]);

  const approvedSongsLove = useMemo(() => {
    if (!songs) return [];
    return songs.filter((s) => s.status === "approved" && s.category === "sevgililer");
  }, [songs]);

  useEffect(() => {
    setReady(true);
    if (isUserLoading) return;
    if (!auth) return;
    if (user) return;

    signInAnonymously(auth).catch((e) => {
      console.error("Anonymous sign-in failed:", e);
      setError("Kimlik doğrulama başarısız. Lütfen sayfayı yenileyin.");
    });
  }, [isUserLoading, user, auth]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firestore || !auth || !user) {
      setError("Bağlantı yok veya kimlik doğrulama başarısız. Sayfayı yenileyin.");
      return;
    }

    setError(null);

    const fn = normalizeText(firstName);
    const ln = normalizeText(lastName);
    const st = normalizeText(songTitle);
    const su = normalizeText(songUrl);

    if (!fn || !st || !su) {
      setError("Lütfen ad, şarkı başlığı ve URL alanlarını doldurun.");
      return;
    }
    if (!isProbablyUrl(su)) {
      setError("Geçerli bir URL girin (örn: https://...).");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        studentName: normalizeText(`${fn} ${ln}`),
        songTitle: st,
        karaokeLink: su,
        status: "pending" as const,
        createdAt: serverTimestamp(),
        studentId: user.uid,
      };

      await addDoc(collection(firestore, "song_requests"), payload);

      setFirstName("");
      setLastName("");
      setSongTitle("");
      setSongUrl("");
      alert("Şarkı isteğiniz başarıyla listeye eklendi. Aşkla söyle! 💘");
    } catch (err: any) {
      console.error("[SUBMIT-ERROR]", err);
      setError(`Gönderim başarısız: ${err?.message || "Bilinmeyen hata"}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen relative overflow-hidden bg-black selection:bg-pink-500/30">
      <header className="mx-auto mt-6 w-[min(1100px,92%)]">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md px-4 sm:px-6 py-4 shadow-[0_0_30px_-5px_rgba(236,72,153,0.3)]">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-4 relative">
              <div className="relative flex items-center justify-center size-10">
                <Heart className="absolute text-pink-600/40 fill-pink-600 blur-[2px] size-12 animate-pulse" />
                <MicVocal className="relative z-10 text-white size-8 drop-shadow-md" />
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight relative z-10">
                <span className="relative inline-block">
                    <span className="text-white relative z-10">BK</span>
                    <Heart className="absolute -top-1 -left-2 size-10 text-rose-500/30 fill-rose-500 -rotate-12 blur-sm -z-10" />
                </span>
                <span className="bg-gradient-to-r from-pink-400 to-rose-600 bg-clip-text text-transparent">araoke</span>
              </h1>
            </div>

            <Link
              href="/admin"
              className="rounded-full bg-white/90 hover:bg-white text-black px-5 py-2 text-sm font-bold shadow-lg shadow-pink-500/20 transition-all"
            >
              Yönetici
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            
            <Sheet>
                <SheetTrigger asChild>
                <Button
                    variant="outline"
                    className="flex-1 rounded-xl bg-gradient-to-r from-pink-500/10 to-rose-500/10 border-pink-500/30 text-pink-200 hover:bg-pink-500/20 hover:text-white transition-all duration-300 h-10 px-6"
                >
                    <Heart className="mr-2 h-4 w-4 fill-pink-500/50" /> ❤️ Aşk Listesi
                </Button>
                </SheetTrigger>

                <SheetContent side="bottom" className="bg-black/80 backdrop-blur-2xl border-t border-pink-500/50 text-white">
                <SheetHeader>
                    <SheetTitle className="text-2xl font-black text-pink-400">❤️ Sevgililer Günü Repertuvarı</SheetTitle>
                    <SheetDescription className="text-neutral-400">Kalbinin sesini dinle.</SheetDescription>
                </SheetHeader>
                <div className="grid gap-3 py-4 max-h-[60vh] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-pink-600">
                    {isLoading ? <p>Yükleniyor...</p> : approvedSongsLove.length > 0 ? (
                    approvedSongsLove.map((s) => (
                        <div key={s.id} className="border border-pink-500/20 rounded-2xl p-4 bg-pink-500/5 hover:bg-pink-500/10 transition-colors">
                        <p className="font-bold text-pink-100 mb-1">{s.songTitle}</p>
                        <div className="flex flex-col gap-1 text-sm">
                            {s.songLink && <a href={s.songLink} target="_blank" className="text-sky-400 hover:underline">🎵 Orijinal</a>}
                            <a href={s.karaokeLink} target="_blank" className="text-pink-400 hover:underline font-medium">🎤 Karaoke</a>
                        </div>
                        </div>
                    ))
                    ) : <p className="text-neutral-400">Bu listede henüz şarkı yok.</p>}
                </div>
                </SheetContent>
            </Sheet>

            <Sheet>
                <SheetTrigger asChild>
                <Button
                    variant="outline"
                    className="flex-1 rounded-xl bg-purple-500/10 border-purple-500/30 text-purple-200 hover:bg-purple-500/20 hover:text-white transition-all duration-300 h-10 px-6"
                >
                    <Disc className="mr-2 h-4 w-4" /> 📼 90'lar Listesi
                </Button>
                </SheetTrigger>

                <SheetContent side="bottom" className="bg-black/80 backdrop-blur-2xl border-t border-purple-500/50 text-white">
                <SheetHeader>
                    <SheetTitle className="text-2xl font-black text-purple-400">📼 90'lar Efsaneleri</SheetTitle>
                    <SheetDescription className="text-neutral-400">Eskimeyen şarkılar.</SheetDescription>
                </SheetHeader>
                <div className="grid gap-3 py-4 max-h-[60vh] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-purple-600">
                    {isLoading ? <p>Yükleniyor...</p> : approvedSongs90s.length > 0 ? (
                    approvedSongs90s.map((s) => (
                        <div key={s.id} className="border border-purple-500/20 rounded-2xl p-4 bg-purple-500/5 hover:bg-purple-500/10 transition-colors">
                        <p className="font-bold text-purple-100 mb-1">{s.songTitle}</p>
                        <div className="flex flex-col gap-1 text-sm">
                            {s.songLink && <a href={s.songLink} target="_blank" className="text-sky-400 hover:underline">🎵 Orijinal</a>}
                            <a href={s.karaokeLink} target="_blank" className="text-purple-400 hover:underline font-medium">🎤 Karaoke</a>
                        </div>
                        </div>
                    ))
                    ) : <p className="text-neutral-400">Bu listede henüz şarkı yok.</p>}
                </div>
                </SheetContent>
            </Sheet>

          </div>
        </div>
      </header>

      <main className="w-full min-h-[calc(100vh-150px)] grid place-items-center py-8">
        <div className="relative mx-auto w-[min(1100px,92%)] rounded-[32px] border border-white/10 bg-black/40 backdrop-blur-xl p-6 sm:p-10 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/5 via-transparent to-purple-500/5 rounded-[32px] pointer-events-none" />
          
          <form onSubmit={onSubmit} className="flex flex-col gap-5 relative z-10">
            <div className="text-center sm:text-left">
                <h2 className="text-xl font-bold text-white mb-1">Şarkını Seç</h2>
                <p className="text-sm text-white/60">
                Sevgililer Günü için özel isteğini gönder. Aşk havada!
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                className="retro-input-soft vhs-interact border-pink-500/20 focus:border-pink-500/60"
                placeholder="Adınız (örn: Kerem)"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <input
                className="retro-input-soft vhs-interact border-pink-500/20 focus:border-pink-500/60"
                placeholder="Soyadınız (örn: Bürsin)"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <input
              className="retro-input-soft vhs-interact border-pink-500/20 focus:border-pink-500/60"
              placeholder="Yazar - Şarkı Başlığı"
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
            />

            <input
              className="retro-input-soft vhs-interact border-pink-500/20 focus:border-pink-500/60"
              placeholder="Şarkı URL (YouTube)"
              value={songUrl}
              onChange={(e) => setSongUrl(e.target.value)}
            />

            {error && (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={submitting || isUserLoading || !user}
                className="retro-btn-soft vhs-interact bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white border-none shadow-lg shadow-pink-900/40 w-full sm:w-auto"
              >
                {submitting ? "İstek Gönderiliyor..." : "İsteği Gönder 💘"}
              </button>
            </div>
          </form>
        </div>
      </main>

      <VhsOverlay intensity={0.08} sfxVolume={0.35} />
    </div>
  );
}
