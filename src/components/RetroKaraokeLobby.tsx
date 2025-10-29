"use client";
import { useState } from "react";

/**
 * 90'lar temalı Karaoke formu.
 * - Neon arkaplan, VHS scanline, memphis konfeti, cam kart
 * - Ad/Soyad yan yana
 * - Şarkı başlığı en az 2 karakter
 * - URL basit doğrulama
 * - Başarılı gönderimde neon toast
 *
 * TODO: handleSubmit içinde Firestore’a addDoc(...) bağla.
 */
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
    if (!firstName.trim() || !lastName.trim() || !songTitle.trim() || !songUrl.trim()) {
      return "Lütfen tüm alanları doldurun.";
    }
    if (songTitle.trim().length < 2) {
      return "Şarkı başlığı en az 2 karakter olmalı.";
    }
    if (!/^https?:\/\//i.test(songUrl.trim())) {
      return "Geçerli bir URL girin (http/https).";
    }
    return null;
  };

  async function submit() {
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setBusy(true);
    try {
      const payload = {
        firstName: cap(firstName.trim()),
        lastName: cap(lastName.trim()),
        songTitle: cap(songTitle.trim()),
        songUrl: songUrl.trim(),
      };
      if (handleSubmit) {
        await handleSubmit(payload);
      }
      setToast("🎶 Şarkı isteğiniz alınmıştır. Katılımınız için teşekkürler!");
      setFirst(""); setLast(""); setTitle(""); setUrl("");
      setTimeout(() => setToast(null), 2600);
    } catch (e: any) {
      setError(e?.message || "Gönderim sırasında bir hata oluştu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black text-white">
      {/* Neon gradient + yıldız tozu */}
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-600/30 via-indigo-700/20 to-black"></div>
      {/* VHS scanlines */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.08] [background:repeating-linear-gradient(0deg,rgba(255,255,255,.8)_0,rgba(255,255,255,.8)_1px,transparent_1px,transparent_3px)]"></div>
      {/* Memphis konfeti */}
      <MemphisConfetti />

      <header className="mx-auto mt-6 w-[min(1100px,92%)]">
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-4 sm:px-6 py-3 shadow-[0_0_40px_rgba(168,85,247,0.25)]">
          <div className="flex items-center gap-3">
            <LogoCassette />
            <h1 className="font-[Lilita One] text-2xl sm:text-3xl tracking-wide">
              Karaoke <span className="text-fuchsia-400">Sırası</span>
            </h1>
          </div>
          <button
            onClick={onAdminClick}
            className="rounded-xl bg-white text-black px-4 py-2 text-sm font-semibold shadow hover:shadow-[0_0_20px_rgba(255,255,255,0.6)] transition"
          >
            Yönetici Paneli
          </button>
        </div>
      </header>

      <main className="mx-auto w-[min(1100px,92%)] mt-12 pb-24">
        <div className="relative mx-auto max-w-xl">
          {/* neon halo */}
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-lime-400 blur-2xl opacity-30" />
          <div className="relative rounded-3xl border border-white/10 bg-white/10 backdrop-blur-lg p-6 sm:p-8 shadow-2xl">
            <Badge90s text="Bir Şarkı İste!" />
            <p className="mt-3 text-sm text-white/80">
              Favori karaoke parçanızı listeye ekleyin. İlk harfler otomatik büyük yapılır.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={firstName}
                onChange={e => setFirst(e.target.value)}
                placeholder="Adınız"
                className="retro-input"
              />
              <input
                value={lastName}
                onChange={e => setLast(e.target.value)}
                placeholder="Soyadınız"
                className="retro-input"
              />
            </div>

            <div className="mt-3 flex flex-col gap-3">
              <input
                value={songTitle}
                onChange={e => setTitle(e.target.value)}
                placeholder="Şarkı Başlığı"
                className="retro-input"
              />
              <input
                value={songUrl}
                onChange={e => setUrl(e.target.value)}
                placeholder="Şarkı URL"
                className="retro-input"
              />
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-400/60 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                onClick={submit}
                disabled={busy}
                className="retro-btn"
              >
                {busy ? "Gönderiliyor..." : "Gönder"}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 px-5 py-3 rounded-xl bg-black/70 border border-white/15 shadow-[0_0_30px_rgba(168,85,247,0.45)]">
          <p className="font-semibold">{toast}</p>
        </div>
      )}

      {/* Stil helper’ları */}
      <style jsx global>{`
        .retro-input {
          @apply w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-fuchsia-500/60 focus:border-white/30 transition;
        }
        .retro-btn {
          @apply inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-5 py-2 font-semibold shadow;
        }
        .retro-btn:hover {
          box-shadow: 0 0 20px rgba(217, 70, 239, 0.6), inset 0 0 10px rgba(59, 130, 246, 0.5);
          transform: translateY(-1px);
        }
        .retro-btn:disabled {
          @apply opacity-70 cursor-not-allowed;
        }
      `}</style>
    </div>
  );
}

/* ———————— Yardımcı 90'lar parçaları ———————— */

function LogoCassette() {
  return (
    <svg width="34" height="26" viewBox="0 0 48 34" fill="none" className="drop-shadow">
      <rect x="1" y="3" width="46" height="26" rx="4" fill="#111" stroke="white" strokeOpacity="0.25" />
      <rect x="6" y="8" width="36" height="8" rx="2" fill="#A855F7" opacity="0.9" />
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

function MemphisConfetti() {
  // hafif, performans dostu dekor
  return (
    <svg className="absolute inset-0 -z-30 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="dots" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <circle cx="6" cy="6" r="2" fill="#22d3ee" />
          <rect x="28" y="28" width="4" height="12" fill="#a855f7" />
          <path d="M50 10 l8 0 l0 8 l-8 0 z" fill="#84cc16" />
        </pattern>
        <linearGradient id="fade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0.4" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots)" />
      <rect width="100%" height="100%" fill="url(#fade)" />
    </svg>
  );
}
