
"use client";
import { useState } from "react";
import VHSStage from "@/components/VHSStage";
import Link from "next/link";
import { useFirebase } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function Page() {
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [songTitle, setTitle] = useState("");
  const [songUrl, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const cap = (s: string) => s.trim().replace(/\b\w/g, c => c.toUpperCase());
  
  const validate = () => {
    if (!firstName.trim() || !lastName.trim() || !songTitle.trim() || !songUrl.trim()) return "Lütfen tüm alanları doldurun.";
    try {
      new URL(songUrl.trim());
    } catch (_) {
      return "Geçerli bir URL girin (örn: https://...).";
    }
    return null;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const validationError = validate();
    if (validationError) {
      setErr(validationError);
      return;
    }

    if (!firestore) {
      setErr("Veritabanı bağlantısı kurulamadı.");
      return;
    }

    setBusy(true);

    try {
      const songRequestsCollection = collection(firestore, "song_requests");
      await addDoc(songRequestsCollection, {
        firstName: cap(firstName),
        lastName: cap(lastName),
        songTitle: cap(songTitle),
        songUrl: songUrl.trim(),
        status: "pending",
        timestamp: serverTimestamp(),
      });

      toast({
        title: "🎶 İstek Gönderildi!",
        description: "Şarkı isteğiniz başarıyla listeye eklendi.",
      });

      setFirst("");
      setLast("");
      setTitle("");
      setUrl("");
    } catch (e: any) {
      console.error("[SUBMIT-ERROR]", e);
      setErr(`Gönderim başarısız: ${e?.message || "Bilinmeyen bir hata oluştu."}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      <header className="mx-auto mt-6 w-[min(1100px,92%)]">
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-4 sm:px-6 py-3 shadow-[0_0_40px_rgba(150,150,150,0.25)]">
          <h1 className="text-2xl sm:text-3xl font-black"><span className="text-neutral-400">90’lar</span> Karaoke</h1>
          <Link href="/admin" className="rounded-2xl bg-white text-black px-4 py-2 text-sm font-semibold shadow">Yönetici Paneli</Link>
        </div>
      </header>

      <main className="w-full min-h-[calc(100vh-96px)] grid place-items-center py-8">
        <div className="relative w-[min(1100px,92%)] rounded-[28px] border border-white/12 bg-white/10 backdrop-blur-xl p-6 sm:p-10 shadow-[0_40px_120px_rgba(150,150,150,0.25)]">
          <div className="pointer-events-none absolute -inset-1 rounded-[32px] bg-gradient-to-r from-neutral-500/30 via-neutral-400/30 to-neutral-300/30 blur-2xl -z-10" />
          <form onSubmit={submit} className="flex flex-col gap-4">
            <p className="text-sm text-white/80">Favori parçanı listeye ekle. İstekler anında yönetici paneline düşer.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input className="retro-input-soft vhs-interact" placeholder="Ad (örn: Tarkan)" value={firstName} onChange={e => setFirst(e.target.value)} />
              <input className="retro-input-soft vhs-interact" placeholder="Soyad (örn: Tevetoğlu)" value={lastName} onChange={e => setLast(e.target.value)} />
            </div>
            <input className="retro-input-soft vhs-interact" placeholder="Şarkı Başlığı (örn: Kuzu Kuzu)" value={songTitle} onChange={e => setTitle(e.target.value)} />
            <input className="retro-input-soft vhs-interact" placeholder="Şarkı URL (örn: https://youtube.com/...)" value={songUrl} onChange={e => setUrl(e.target.value)} />
            {err && <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{err}</div>}
            <div className="flex justify-end">
              <button type="submit" disabled={busy} className="retro-btn-soft vhs-interact">{busy ? "Gönderiliyor..." : "Gönder"}</button>
            </div>
          </form>
        </div>
      </main>
      
      <VHSStage intensity={0.1} sfxVolume={0.4} />
    </div>
  );
}
