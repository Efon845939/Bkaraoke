
"use client";
import { useState, useEffect } from "react";
import VHSStage from "@/components/VHSStage";
import Link from "next/link";
import { Mic } from "lucide-react";
import { useFirebase } from "@/firebase";

function KaraokePage() {
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [songTitle, setTitle] = useState("");
  const [songUrl, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    loadLog();
  }, []);

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

  const loadLog = () => {
    try {
      const storedLog = localStorage.getItem("karaoke_log");
      if (storedLog) setLog(JSON.parse(storedLog));
    } catch (e) {
      console.error("Failed to load log from localStorage", e);
    }
  };

  const addToLog = (action: string) => {
    const newLogEntry = `${new Date().toISOString()} - ${action}`;
    const updatedLog = [newLogEntry, ...log];
    setLog(updatedLog);
    try {
      localStorage.setItem("karaoke_log", JSON.stringify(updatedLog));
    } catch (e) {
      console.error("Failed to save log to localStorage", e);
    }
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const validationError = validate();
    if (validationError) {
      setErr(validationError);
      return;
    }

    setBusy(true);

    await new Promise(resolve => setTimeout(resolve, 750));

    try {
      const existingSongs = JSON.parse(localStorage.getItem("karaoke_songs") || "[]");
      const newSong = {
        id: Date.now().toString(),
        firstName: cap(firstName),
        lastName: cap(lastName),
        songTitle: cap(songTitle),
        songUrl: songUrl.trim(),
        status: "pending",
        timestamp: new Date().toISOString(),
      };
      
      const updatedSongs = [...existingSongs, newSong];
      localStorage.setItem("karaoke_songs", JSON.stringify(updatedSongs));
      
      addToLog(`İSTEK EKLENDİ: "${newSong.songTitle}" by ${newSong.firstName} ${newSong.lastName}`);

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

  if (!isClient) {
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <header className="mx-auto mt-6 w-[min(1100px,92%)]">
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <Mic className="text-neutral-400 size-7" />
            <h1 className="text-2xl sm:text-3xl font-black"><span className="text-neutral-400">90’lar</span> Karaoke</h1>
          </div>
          <Link href="/admin" className="rounded-2xl bg-white text-black px-4 py-2 text-sm font-semibold shadow">Yönetici Paneli</Link>
        </div>
      </header>

      <main className="w-full min-h-[calc(100vh-96px)] grid place-items-center py-8">
        <div className="relative mx-auto w-[min(1100px,92%)] rounded-[28px] border border-white/12 bg-white/10 backdrop-blur-xl p-6 sm:p-10">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <p className="text-sm text-white/80">Favori parçanı listeye ekle. İstekler anında yönetici paneline düşer.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input className="retro-input-soft vhs-interact" placeholder="Öğrenci/Öğretmen Adı (örn: Gökçe)" value={firstName} onChange={e => setFirst(e.target.value)} />
              <input className="retro-input-soft vhs-interact" placeholder="Öğrenci/Öğretmen Soyadı (örn: Eyüboğlu)" value={lastName} onChange={e => setLast(e.target.value)} />
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
      
      {isClient && <VHSStage intensity={0.1} sfxVolume={0.4} />}
    </div>
  );
}


export default function Page() {
  return (
    <KaraokePage />
  )
}
