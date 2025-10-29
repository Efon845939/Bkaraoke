
'use client';

import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Home } from "lucide-react";
import Link from "next/link";

export default function AdminPanel() {
  const [auth, setAuth] = useState(false);
  const [input, setInput] = useState("");
  const [songs, setSongs] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(false);

  const ADMIN_PASS = "90'sKaraoke";

  useEffect(() => {
    if (auth) {
      loadSongs();
    }
  }, [auth, refresh]);

  async function loadSongs() {
    const q = query(collection(db, "song_requests"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    setSongs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  async function updateStatus(id: string, status: "approved" | "rejected") {
    await updateDoc(doc(db, "song_requests", id), { status });
    setRefresh(!refresh);
  }
  
  const handleLogin = () => {
    if (input === ADMIN_PASS) {
        setAuth(true);
    }
  }

  if (!auth) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-black text-white">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-600/30 via-indigo-700/20 to-black"></div>
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.08] [background:repeating-linear-gradient(0deg,rgba(255,255,255,.8)_0,rgba(255,255,255,.8)_1px,transparent_1px,transparent_3px)]"></div>
        <MemphisConfetti />

        <header className="mx-auto mt-6 w-[min(1100px,92%)]">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-4 sm:px-6 py-3 shadow-[0_0_40px_rgba(168,85,247,0.25)]">
              <div className="flex items-center gap-3">
                 <Link href="/" passHref className="flex items-center gap-3">
                    <LogoCassette />
                    <h1 className="font-[Lilita One] text-2xl sm:text-3xl tracking-wide">
                      Karaoke <span className="text-fuchsia-400">Sırası</span>
                    </h1>
                 </Link>
              </div>
            </div>
        </header>

        <main className="flex flex-col items-center justify-center min-h-[80vh] px-4">
            <div className="relative mx-auto w-full max-w-sm">
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-lime-400 blur-2xl opacity-30" />
                <div className="relative rounded-3xl border border-white/10 bg-white/10 backdrop-blur-lg p-6 sm:p-8 shadow-2xl">
                    <Badge90s text="Yönetici Girişi" />
                    <p className="mt-3 text-sm text-white/80">
                      Lütfen yönetici paneline erişmek için parolayı girin.
                    </p>
                    <div className="mt-6 flex flex-col gap-3">
                        <input
                          type="password"
                          placeholder="Admin Şifresi"
                          value={input}
                          onChange={e => setInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                          className="retro-input"
                        />
                    </div>
                    <div className="mt-5 flex justify-end">
                        <button
                          onClick={handleLogin}
                          className="retro-btn w-full"
                        >
                          Giriş
                        </button>
                    </div>
                </div>
            </div>
        </main>
        
        <StyleHelper />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black text-white">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-600/30 via-indigo-700/20 to-black"></div>
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.08] [background:repeating-linear-gradient(0deg,rgba(255,255,255,.8)_0,rgba(255,255,255,.8)_1px,transparent_1px,transparent_3px)]"></div>
      <MemphisConfetti />

       <header className="mx-auto mt-6 w-[min(1100px,92%)] sticky top-6 z-20">
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-4 sm:px-6 py-3 shadow-[0_0_40px_rgba(168,85,247,0.25)]">
          <div className="flex items-center gap-3">
            <h1 className="font-[Lilita One] text-2xl sm:text-3xl tracking-wide">
              Yönetim <span className="text-cyan-400">Paneli</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setRefresh(!refresh)} className="retro-btn-secondary">Yenile</button>
            <button onClick={()=>setAuth(false)} className="retro-btn-destructive">Çıkış</button>
            <Link href="/" passHref>
              <button className="retro-btn-secondary">
                <Home className="mr-2 h-4 w-4 inline-block" /> Lobiye Dön
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-[min(1100px,92%)] mt-8 pb-24">
        <div className="relative mx-auto w-full">
           <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-lime-400 blur-2xl opacity-30" />
           <div className="relative rounded-3xl border border-white/10 bg-white/10 backdrop-blur-lg p-6 sm:p-8 shadow-2xl">
              <Badge90s text="Şarkı İstekleri" />
              <div className="mt-6 grid gap-4">
              {songs.map(s => (
                <div key={s.id} className="border border-white/10 bg-white/5 backdrop-blur-sm p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <strong className="text-lg">{s.firstName} {s.lastName}</strong>
                    <p className="text-md text-white/80">{s.songTitle}</p>
                    <a href={s.songUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:underline break-all">{s.songUrl}</a>
                    <p className={`mt-2 text-sm font-bold ${s.status === "approved" ? "text-lime-400" : s.status === "rejected" ? "text-red-500" : "text-amber-400"}`}>
                      Durum: {s.status}
                    </p>
                  </div>
                  <div className="flex gap-2 self-start sm:self-center">
                    <button onClick={()=>updateStatus(s.id, "approved")} className="retro-btn-success">Onayla</button>
                    <button onClick={()=>updateStatus(s.id, "rejected")} className="retro-btn-destructive">Reddet</button>
                  </div>
                </div>
              ))}
              {songs.length === 0 && <p className="text-center text-white/60">Henüz şarkı isteği yok.</p>}
            </div>
           </div>
        </div>
      </main>
      <StyleHelper />
    </div>
  );
}


/* ———————— Yardımcı 90'lar parçaları ———————— */

function StyleHelper() {
  return (
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
        .retro-btn-secondary {
          @apply inline-flex items-center justify-center rounded-xl bg-black/20 border border-white/15 px-4 py-2 font-semibold shadow text-white;
        }
        .retro-btn-secondary:hover {
           background-color: rgba(255,255,255,0.1);
        }
        .retro-btn-destructive {
           @apply inline-flex items-center justify-center rounded-xl bg-red-800/50 border border-red-500/50 px-4 py-2 font-semibold shadow text-white;
        }
        .retro-btn-destructive:hover {
            @apply bg-red-800/80;
        }
        .retro-btn-success {
           @apply inline-flex items-center justify-center rounded-xl bg-green-800/50 border border-green-500/50 px-4 py-2 font-semibold shadow text-white;
        }
        .retro-btn-success:hover {
            @apply bg-green-800/80;
        }
      `}</style>
  );
}


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
