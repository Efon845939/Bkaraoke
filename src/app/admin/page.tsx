"use client";
import { useEffect, useState } from "react";
import VHSStage from "@/components/VHSStage";
import Link from "next/link";

type Song = {
  id: string;
  firstName: string;
  lastName: string;
  songTitle: string;
  songUrl: string;
  status: "pending" | "approved" | "rejected";
  timestamp: number;
};

const STORAGE_KEY = "karaoke_requests_offline";
const ADMIN_PASS = "gizli_kara90ke";

function loadSongsFromStorage(): Song[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveSongsToStorage(data: Song[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function AdminPage() {
  const [auth, setAuth] = useState(false);
  const [pw, setPw] = useState("");
  const [rows, setRows] = useState<Song[]>([]);
  const [load, setLoad] = useState(false);
  const [visitedLinks, setVisitedLinks] = useState<Set<string>>(new Set());

  function loadSongs() {
    setLoad(true);
    const songs = loadSongsFromStorage();
    songs.sort((a, b) => b.timestamp - a.timestamp);
    setRows(songs);
    setLoad(false);
  }

  function setStatus(id: string, status: "approved" | "rejected") {
    const updatedRows = rows.map((row) => {
      if (row.id === id) {
        return { ...row, status: status };
      }
      return row;
    });
    saveSongsToStorage(updatedRows);
    setRows(updatedRows);
  }

  function handleLinkClick(id: string) {
    setVisitedLinks((prev) => new Set(prev).add(id));
  }

  useEffect(() => {
    if (auth) loadSongs();
  }, [auth]);

  const pendingSongs = rows.filter((s) => s.status === "pending");
  const approvedSongs = rows.filter((s) => s.status === "approved");
  const rejectedSongs = rows.filter((s) => s.status === "rejected");

  if (!auth) {
    return (
      <div className="min-h-screen grid place-items-center relative">
        <div className="relative rounded-[28px] border border-white/12 bg-white/10 backdrop-blur-xl p-8 w-[min(420px,92%)]">
          <h1 className="text-2xl font-black mb-4 text-fuchsia-300">Yönetici Girişi</h1>
          <input type="password" className="retro-input-soft vhs-interact" placeholder="Şifre" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button onClick={() => setAuth(pw === ADMIN_PASS)} className="retro-btn-soft vhs-interact w-full mt-4">Giriş</button>
          {pw && pw !== ADMIN_PASS && <p className="mt-2 text-sm text-red-300">Yanlış şifre.</p>}
          <div className="text-center mt-4">
            <Link href="/" className="text-sm text-white/60 hover:text-white transition">Lobiye dön</Link>
          </div>
        </div>
        <VHSStage intensity={0.1} sfxVolume={0.35} />
      </div>
    );
  }

  const SongRow = ({ s }: { s: Song }) => (
    <div className="border border-white/15 rounded-2xl p-3 flex justify-between items-center bg-white/5 backdrop-blur">
      <div>
        <strong>{s.firstName} {s.lastName}</strong> — {s.songTitle}
        <a href={s.songUrl} target="_blank" rel="noopener noreferrer" onClick={() => handleLinkClick(s.id)} className="block text-sm text-cyan-300 hover:underline">
          {s.songUrl}
        </a>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setStatus(s.id, "approved")}
          disabled={!visitedLinks.has(s.id)}
          className="rounded-xl px-3 py-2 bg-green-500/80 disabled:bg-gray-500/50 disabled:cursor-not-allowed"
          title={!visitedLinks.has(s.id) ? "Önce linke tıklayın" : "Onayla"}
        >
          Onayla
        </button>
        <button
          onClick={() => setStatus(s.id, "rejected")}
          disabled={!visitedLinks.has(s.id)}
          className="rounded-xl px-3 py-2 bg-red-500/80 disabled:bg-gray-500/50 disabled:cursor-not-allowed"
          title={!visitedLinks.has(s.id) ? "Önce linke tıklayın" : "Reddet"}
        >
          Reddet
        </button>
      </div>
    </div>
  );
  
  const ReadOnlySongRow = ({ s }: { s: Song }) => (
     <div className="border border-white/15 rounded-2xl p-3 flex justify-between items-center bg-black/20 backdrop-blur opacity-60">
        <div>
            <strong>{s.firstName} {s.lastName}</strong> — {s.songTitle}
            <div className="text-sm text-white/70">{s.songUrl}</div>
        </div>
        <div className={`text-sm font-bold ${s.status === "approved" ? "text-green-400" : "text-red-400"}`}>
            {s.status === "approved" ? "Onaylandı" : "Reddedildi"}
        </div>
    </div>
  );

  return (
    <div className="min-h-screen p-6 relative">
      <div className="mx-auto w-[min(1100px,92%)]">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black">Yönetici Paneli (Çevrimdışı)</h1>
          <div className="flex gap-2">
            <button onClick={loadSongs} className="retro-btn-soft vhs-interact">{load ? "Yükleniyor…" : "Yenile"}</button>
            <button onClick={() => setAuth(false)} className="rounded-2xl px-4 py-3 border border-white/20">Çıkış</button>
          </div>
        </div>

        {/* Onay Bekleyenler */}
        <section>
          <h2 className="text-xl font-bold mb-3 text-amber-300">Onay Bekleyenler</h2>
          <div className="grid gap-2">
            {pendingSongs.length > 0 ? (
              pendingSongs.map((s) => <SongRow key={s.id} s={s} />)
            ) : (
              <p className="text-white/70">Onay bekleyen istek yok.</p>
            )}
          </div>
        </section>

        {/* Onaylananlar */}
        <section className="mt-8">
          <h2 className="text-xl font-bold mb-3 text-green-400">Onaylananlar</h2>
          <div className="grid gap-2">
            {approvedSongs.length > 0 ? (
              approvedSongs.map((s) => <ReadOnlySongRow key={s.id} s={s} />)
            ) : (
              <p className="text-white/70">Henüz onaylanan istek yok.</p>
            )}
          </div>
        </section>

        {/* Reddedilenler */}
        <section className="mt-8">
          <h2 className="text-xl font-bold mb-3 text-red-400">Reddedilenler</h2>
          <div className="grid gap-2">
            {rejectedSongs.length > 0 ? (
              rejectedSongs.map((s) => <ReadOnlySongRow key={s.id} s={s} />)
            ) : (
              <p className="text-white/70">Henüz reddedilen istek yok.</p>
            )}
          </div>
        </section>

      </div>
      <VHSStage intensity={0.1} sfxVolume={0.35} />
    </div>
  );
}
