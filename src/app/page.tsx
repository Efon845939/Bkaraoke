"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signInAnonymously } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { useCollection, useFirebase, useMemoFirebase, useUser } from "@/firebase";
import { Music2, Trophy } from "lucide-react";
import VhsOverlay from "@/components/VhsOverlay";
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

  // Firestore query
  const songRequestsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "song_requests");
  }, [firestore]);

  const { data: songs, isLoading } = useCollection<Song>(songRequestsQuery);

  const approvedSongs = useMemo(() => {
    if (!songs) return [];
    return songs.filter((s) => s.status === "approved");
  }, [songs]);

  // IMPORTANT: Auth (anonymous) so Firestore rules that require request.auth won't explode
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
      alert("Şarkı isteğiniz başarıyla listeye eklendi.");
    } catch (err: any) {
      console.error("[SUBMIT-ERROR]", err);
      setError(`Gönderim başarısız: ${err?.message || "Bilinmeyen hata"}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <header className="mx-auto mt-6 w-[min(1100px,92%)]">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-4 sm:px-6 py-4">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-3">
              <Music2 className="text-neutral-400 size-7" />
              <h1 className="text-2xl sm:text-3xl font-black">
                <span className="text-neutral-400">B</span>Kara
                <span className="text-red-500">90</span>ke
              </h1>
            </div>

            <Link
              href="/admin"
              className="rounded-2xl bg-white text-black px-4 py-2 text-sm font-semibold shadow"
            >
              Yönetici Paneli
            </Link>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="w-full sm:w-auto bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-500/20 hover:text-fuchsia-200"
              >
                <Trophy className="mr-2 h-4 w-4" /> 90'lar Repertuvarımız
              </Button>
            </SheetTrigger>

            <SheetContent
              side="bottom"
              className="bg-black/80 backdrop-blur-xl border-t-2 border-fuchsia-500/50 text-white"
            >
              <SheetHeader>
                <SheetTitle className="text-2xl font-black text-fuchsia-300">
                  Repertuvarımız
                </SheetTitle>
                <SheetDescription className="text-neutral-400">
                  Linke tıklayarak doğrudan karaoke videosuna gidebilirsiniz.
                </SheetDescription>
              </SheetHeader>

              <div className="grid gap-3 py-4 max-h-[60vh] overflow-y-auto pr-4">
                {isLoading ? (
                  <p>Repertuvar yükleniyor...</p>
                ) : approvedSongs.length > 0 ? (
                  approvedSongs.map((s) => (
                    <div
                      key={s.id}
                      className="border border-white/15 rounded-xl p-3 bg-white/5"
                    >
                      <p className="font-bold text-neutral-100">{s.songTitle}</p>
                      <a
                        href={s.karaokeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-fuchsia-300 hover:underline break-all"
                      >
                        {s.karaokeLink}
                      </a>
                    </div>
                  ))
                ) : (
                  <p className="text-neutral-400">Henüz onaylanmış bir şarkı yok.</p>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="w-full min-h-[calc(100vh-150px)] grid place-items-center py-8">
        <div className="relative mx-auto w-[min(1100px,92%)] rounded-[28px] border border-white/12 bg-white/10 backdrop-blur-xl p-6 sm:p-10">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-white/80">
              Favori parçanı listeye ekle. İstekler anında yönetici paneline düşer.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                className="retro-input-soft vhs-interact"
                placeholder="Adınız (örn: Gökçe)"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <input
                className="retro-input-soft vhs-interact"
                placeholder="Soyadınız (örn: Eyüboğlu)"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <input
              className="retro-input-soft vhs-interact"
              placeholder="Yazar-Şarkı Başlığı (örn: Şebnem Ferah-Sil Baştan)"
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
            />

            <input
              className="retro-input-soft vhs-interact"
              placeholder="Şarkı URL (örn: https://youtube.com/...)"
              value={songUrl}
              onChange={(e) => setSongUrl(e.target.value)}
            />

            {error && (
              <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || isUserLoading || !user}
                className="retro-btn-soft vhs-interact"
              >
                {submitting ? "Gönderiliyor..." : "Gönder"}
              </button>
            </div>
          </form>
        </div>
      </main>

      <VhsOverlay intensity={0.1} sfxVolume={0.35} />
    </div>
  );
}
