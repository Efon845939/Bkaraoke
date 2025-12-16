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
  songLink?: string;     // ✅ normal
  karaokeLink: string;   // ✅ karaoke
  status: "pending" | "approved" | "rejected";
  createdAt: any;
};

// Türkçe’de random büyük harf çıkmasın diye ASCII regex’i çöpe atıyoruz.
function capTR(input: string) {
  const s = (input || "").trim();
  if (!s) return "";

  // Kelimeleri boşluklara göre ayır, her kelimenin ilk harfini TR lower/upper ile düzelt.
  // "BaşTan" gibi saçmalıklar bu sayede biter.
  return s
    .split(" ")
    .filter(Boolean)
    .map((w) => {
      const wl = w.toLocaleLowerCase("tr-TR");
      return wl.charAt(0).toLocaleUpperCase("tr-TR") + wl.slice(1);
    })
    .join(" ");
}

function KaraokePage() {
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [songTitle, setTitle] = useState("");

  // ✅ artık kullanıcıdan “normal link” alıyoruz (tek input)
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
      signInAnonymously(auth).catch((error) => {
        console.error("Anonymous sign-in failed", error);
        setErr("Kimlik doğrulama başarısız. Lütfen sayfayı yenileyin.");
      });
    }
  }, [isUserLoading, user, auth]);

  const validate = () => {
    if (!firstName.trim() || !songTitle.trim() || !songUrl.trim())
      return "Lütfen ad, şarkı başlığı ve URL alanlarını doldurun.";
    try {
      new URL(songUrl.trim());
    } catch {
      return "Geçerli bir URL girin (örn: https://...).";
    }
    return null;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!firestore || !auth || !user) {
      setErr("Veritabanı bağlantısı veya kimlik doğrulama yok. Sayfayı yenileyin.");
      return;
    }
    setErr(null);

    const validationError = validate();
    if (validationError) {
      setErr(validationError);
      return;
    }

    setBusy(true);

    try {
      const songRequestsCollection = collection(firestore, "song_requests");

      const newSong = {
        studentName: `${capTR(firstName)} ${capTR(lastName)}`.trim(),
        songTitle: capTR(songTitle),

        // ✅ kullanıcı “normal link” gönderiyor.
        // Karaoke linkini admin/owner sonradan ekler (veya bulk ile basar).
        songLink: songUrl.trim(),
        karaokeLink: songUrl.trim(), // fallback: yoksa aynı kalsın, owner sonra düzeltir.

        status: "pending",
        createdAt: serverTimestamp(),
        studentId: user.uid,
      };

      await addDoc(songRequestsCollection, newSong);

      setFirst("");
      setLast("");
      setTitle("");
      setUrl("");

      alert("Şarkı isteğiniz başarıyla listeye eklendi.");
    } catch (e: any) {
      console.error("[SUBMIT-ERROR]", e);
      setErr(`Gönderim başarısız: ${e?.message || "Bilinmeyen bir hata oluştu."}`);
    } finally {
      setBusy(false);
    }
  }

  if (!isClient) return null;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <header className="mx-auto mt-6 w-[min(1100px,92%)]">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-4 sm:px-6 py-4">
          <div className="flex w-full items-center justify-between">
            <Link
              href="/"
              aria-label="Ana sayfaya dön"
              className="flex items-center gap-3 select-none hover:opacity-90 transition"
            >
              <Mic className="text-neutral-400 size-7" />
              <h1 className="text-2xl sm:text-3xl font-black">
                <span className="text-neutral-400">B</span>Kara
                <span className="text-red-500">90</span>ke
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
              <Button
                variant="outline"
                className="w-full sm:w-auto bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-500/20 hover:text-fuchsia-200"
              >
                <Music className="mr-2 h-4 w-4" /> 90&apos;lar Repertuvarımız
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
                  Hem normal link hem karaoke link var. Karaoke yoksa owner/admin düzeltir.
                </SheetDescription>
              </SheetHeader>

              <div className="grid gap-3 py-4 max-h-[60vh] overflow-y-auto pr-4">
                {songsLoading ? (
                  <p className="text-neutral-400">Yükleniyor…</p>
                ) : approvedSongs.length ? (
                  approvedSongs.map((song) => (
                    <div
                      key={song.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="font-bold text-neutral-100">
                        {song.songTitle}
                      </div>

                      <div className="mt-2 grid gap-1 text-sm">
                        {song.songLink ? (
                          <a
                            href={song.songLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-300 hover:underline"
                          >
                            Normal link
                          </a>
                        ) : (
                          <span className="text-neutral-500">Normal link yok</span>
                        )}

                        <a
                          href={song.karaokeLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-fuchsia-300 hover:underline"
                        >
                          Karaoke link
                        </a>
                      </div>
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
          <form onSubmit={submit} className="flex flex-col gap-4">
            <p className="text-sm text-white/80">
              Favori parçanı iste. (Owner/admin onaylayınca repertuvara düşer.)
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                className="retro-input-soft vhs-interact"
                placeholder="Adınız (örn: Gökçe)"
                value={firstName}
                onChange={(e) => setFirst(e.target.value)}
              />
              <input
                className="retro-input-soft vhs-interact"
                placeholder="Soyadınız (örn: Eyüboğlu)"
                value={lastName}
                onChange={(e) => setLast(e.target.value)}
              />
            </div>

            <input
              className="retro-input-soft vhs-interact"
              placeholder="Yazar-Şarkı Başlığı (örn: Şebnem Ferah-Sil Baştan)"
              value={songTitle}
              onChange={(e) => setTitle(e.target.value)}
            />

            <input
              className="retro-input-soft vhs-interact"
              placeholder="Şarkı URL (örn: https://youtube.com/...)"
              value={songUrl}
              onChange={(e) => setUrl(e.target.value)}
            />

            {err && (
              <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {err}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy || isUserLoading || !user}
                className="retro-btn-soft vhs-interact"
              >
                {busy ? "Gönderiliyor..." : "Gönder"}
              </button>
            </div>
          </form>
        </div>
      </main>

      <VHSStage intensity={0.1} sfxVolume={0.35} />
    </div>
  );
}

export default function Page() {
  return <KaraokePage />;
}
