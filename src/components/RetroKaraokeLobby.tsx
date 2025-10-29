"use client";
import { useState } from "react";
import { addDoc, collection, serverTimestamp, waitForPendingWrites, setLogLevel } from "firebase/firestore";
import { db } from "@/lib/firebase";
import VHSStage from "./VHSStage";

setLogLevel("debug"); // en üste bir kere

// Tüm yakalanmamış promise hatalarını yaz
if (typeof window !== "undefined") {
  window.onunhandledrejection = (e: any) => {
    const err: any = e?.reason || e;
    // FirebaseError tüm alanları
    const dump = Object.fromEntries(
      Object.getOwnPropertyNames(err).map(k => [k, (err as any)[k]])
    );
    console.log("[UNHANDLED]", dump);
  };
}


export default function RetroKaraokeLobby({
  onAdminClick,
  handleSubmit,
}: {
  onAdminClick?: () => void;
  handleSubmit?: (data: {
    firstName: string;
    lastName: string;
    songTitle: string;
    songUrl: string;
  }) => Promise<void> | void;
}) {
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [songTitle, setTitle] = useState("");
  const [songUrl, setUrl] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cap = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase());
  const validate = () => {
    if (!firstName.trim() || !lastName.trim() || !songTitle.trim() || !songUrl.trim())
      return "Lütfen tüm alanları doldurun.";
    if (!/^https?:\/\//i.test(songUrl.trim())) return "Geçerli bir URL girin (http/https).";
    return null;
  };

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    console.log("[KARAOKE] submit start", {
      projectId: db.app.options.projectId
    });
    setError(null);
    const v = validate();
    if (v) return setError(v);

    setBusy(true);

    try {
       const payload = {
        firstName: cap(firstName.trim()),
        lastName: cap(lastName.trim()),
        songTitle: cap(songTitle.trim()),
        songUrl: songUrl.trim(),
      };
      
      if (!handleSubmit) {
        console.log("[KARAOKE] handleSubmit prop'u sağlanmamış. Doğrudan Firestore'a yazma deneniyor.");
        await addDoc(collection(db, "song_requests"), {
          ...payload,
          status: "pending",
          timestamp: serverTimestamp(),
        });
        await waitForPendingWrites(db);
        console.log("[KARAOKE] Doğrudan yazma başarılı.");
      } else {
         await handleSubmit(payload);
      }

      setToast("🎶 Şarkı isteğiniz alınmıştır. Katılımınız için teşekkürler!");
      setFirst(""); setLast(""); setTitle(""); setUrl("");
      setTimeout(() => setToast(null), 2600);
    } catch (e: any) {
      console.error("[SUBMIT-ERROR] code=", e?.code, " message=", e?.message, " name=", e?.name, " stack=", e?.stack, " details=", e);
      setError(`${e?.code || "error"}: ${e?.message || "Gönderim başarısız"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-black text-white">
      <VHSStage intensity={0.10} sfxVolume={0.4} />
      {/* Arka plan */}
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_center,_rgba(168,85,247,0.25),_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06] [background:repeating-linear-gradient(0deg,rgba(255,255,255,.7)_0,rgba(255,255,255,.7)_1px,transparent_1px,transparent_3px)]" />
      {/* Üst bar */}
      <header className="w-full">
        <div className="mx-auto mt-4 w-[min(1200px,94%)] flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-4 sm:px-6 py-3 shadow-[0_0_40px_rgba(168,85,247,0.25)]">
          <div className="flex items-center gap-3">
            <LogoCassette />
            <h1 className="font-[Lilita One] text-2xl sm:text-3xl tracking-wide">
              Karaoke <span className="text-fuchsia-400">Sırası</span>
            </h1>
          </div>
          <button
            onClick={onAdminClick}
            className="vhs-interact rounded-2xl bg-white text-black px-4 py-2 text-sm font-semibold shadow hover:shadow-[0_0_20px_rgba(255,255,255,0.6)] transition"
          >
            Yönetici Paneli
          </button>
        </div>
      </header>

      {/* ORTALAMA + TAM EKRAN PANEL */}
      <main className="w-full min-h-[calc(100vh-96px)] grid place-items-center py-8">
        <form onSubmit={submit} className="relative w-[min(1100px,92%)] rounded-[28px] border border-white/12 bg-white/10 backdrop-blur-xl p-6 sm:p-10 shadow-[0_40px_120px_rgba(168,85,247,0.25)]">
          {/* Neon halo */}
          <div className="pointer-events-none absolute -inset-1 rounded-[32px] bg-gradient-to-r from-fuchsia-500/30 via-cyan-400/30 to-lime-400/30 blur-2xl -z-10" />

          <div className="flex flex-col gap-6">
            <Badge90s text="Bir Şarkı İste!" />
            <p className="text-sm text-white/80">
              Favori karaoke parçanızı listeye ekleyin. İlk harfler otomatik büyük yapılır.
            </p>

            {/* INPUTLAR: daha yuvarlak, dolgu yüksek, focus ring yumuşak */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                value={firstName}
                onChange={e => setFirst(e.target.value)}
                placeholder="Adınız (örn: Bülent)"
                className="retro-input-soft vhs-interact"
              />
              <input
                value={lastName}
                onChange={e => setLast(e.target.value)}
                placeholder="Soyadınız (örn: Ersoy)"
                className="retro-input-soft vhs-interact"
              />
            </div>

            <input
              value={songTitle}
              onChange={e => setTitle(e.target.value)}
              placeholder="Şarkı Başlığı (örn: Benim Yerime de Sev)"
              className="retro-input-soft vhs-interact"
            />
            <input
              value={songUrl}
              onChange={e => setUrl(e.target.value)}
              placeholder="Şarkı URL (örn: https://youtube.com/...)"
              className="retro-input-soft vhs-interact"
            />

            {error && (
              <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button type="submit" disabled={busy} className="retro-btn-soft vhs-interact">
                {busy ? "Gönderiliyor..." : "Gönder"}
              </button>
            </div>
          </div>
        </form>
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 px-5 py-3 rounded-2xl bg-black/70 border border-white/12 shadow-[0_0_30px_rgba(168,85,247,0.45)]">
          <p className="font-semibold">{toast}</p>
        </div>
      )}

      {/* Global yardımcı stiller */}
      <style jsx global>{`
        .retro-input-soft {
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.08);
          color: white;
          width: 100%;
          padding: 0.9rem 1rem;
          border-radius: 16px;            /* daha yuvarlak */
          outline: none;
          transition: box-shadow .2s, border-color .2s, transform .05s;
        }
        .retro-input-soft::placeholder { color: rgba(255,255,255,0.55); }
        .retro-input-soft:focus {
          border-color: rgba(217,70,239,0.65);
          box-shadow: 0 0 0 4px rgba(217,70,239,0.18), 0 0 32px rgba(59,130,246,0.25) inset;
          transform: translateY(-1px);
        }

        .retro-btn-soft {
          background: linear-gradient(90deg, #d946ef, #6366f1);
          color: white;
          padding: 0.9rem 1.25rem;
          border-radius: 16px;            /* buton da yumuşak */
          font-weight: 700;
          box-shadow: 0 8px 24px rgba(99,102,241,0.35);
          transition: transform .08s ease, box-shadow .2s ease, filter .2s;
        }
        .retro-btn-soft:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 30px rgba(217,70,239,0.45);
          filter: saturate(1.1);
        }
        .retro-btn-soft:disabled { opacity: .7; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

/* ——— yardımcı parçalar ——— */
function LogoCassette() {
  return (
    <svg width="34" height="26" viewBox="0 0 48 34" fill="none" className="drop-shadow">
      <rect x="1" y="3" width="46" height="26" rx="6" fill="#111" stroke="white" strokeOpacity="0.25" />
      <rect x="6" y="8" width="36" height="8" rx="3" fill="#A855F7" opacity="0.9" />
      <circle cx="16" cy="22" r="3.2" fill="#22D3EE" />
      <circle cx="32" cy="22" r="3.2" fill="#22D3EE" />
    </svg>
  );
}
function Badge90s({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-gradient-to-r from-fuchsia-600/50 to-cyan-500/40 px-4 py-2 shadow">
      <span className="font-[Lilita One] text-xl tracking-wide">{text}</span>
      <span className="text-xs bg-black/40 px-2 py-0.5 rounded-md border border-white/15">VHS</span>
    </div>
  );
}
