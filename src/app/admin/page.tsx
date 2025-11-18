
"use client";
import { useEffect, useState } from "react";
import VHSStage from "@/components/VHSStage";
import Link from "next/link";
import { X, Edit, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Song = {
  id: string;
  firstName: string;
  lastName: string;
  songTitle: string;
  songUrl: string;
  status: "pending" | "approved" | "rejected";
  timestamp: string;
};

const ADMIN_PASS = "kara90ke";
const OWNER_PASS = "gizli_kara90ke";

// --- Login Component ---
const LoginScreen = ({ onAuth }: { onAuth: (level: "admin" | "owner") => void }) => {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  const handleLogin = () => {
    if (pw === OWNER_PASS) {
      onAuth("owner");
    } else if (pw === ADMIN_PASS) {
      onAuth("admin");
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center relative">
      <div className="relative rounded-[28px] border border-white/12 bg-white/10 backdrop-blur-xl p-8 w-[min(420px,92%)]">
        <h1 className="text-2xl font-black mb-4 text-neutral-300">Yönetici Girişi</h1>
        <input
          type="password"
          className="retro-input-soft vhs-interact"
          placeholder="Şifre"
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />
        <button onClick={handleLogin} className="retro-btn-soft vhs-interact w-full mt-4">Giriş</button>
        {error && <p className="mt-2 text-sm text-red-300">Yanlış şifre.</p>}
        <div className="text-center mt-4">
          <Link href="/" className="text-sm text-white/60 hover:text-white transition">Lobiye dön</Link>
        </div>
      </div>
      <VHSStage />
    </div>
  );
};


// --- Admin Panel Component ---
const AdminPanel = ({ authLevel, onLogout }: { authLevel: "admin" | "owner", onLogout: () => void }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [visitedLinks, setVisitedLinks] = useState<Set<string>>(new Set());
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [deletingSong, setDeletingSong] = useState<Song | null>(null);

  const loadData = () => {
    try {
      const storedSongs = localStorage.getItem("karaoke_songs");
      if (storedSongs) setSongs(JSON.parse(storedSongs).sort((a: Song, b: Song) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      
      const storedLog = localStorage.getItem("karaoke_log");
      if (storedLog) setLog(JSON.parse(storedLog));
    } catch(e) {
      console.error("Failed to load data from localStorage", e);
    }
  };

  const saveData = (updatedSongs: Song[], updatedLog: string[]) => {
    try {
      localStorage.setItem("karaoke_songs", JSON.stringify(updatedSongs));
      setSongs(updatedSongs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      
      localStorage.setItem("karaoke_log", JSON.stringify(updatedLog));
      setLog(updatedLog);
    } catch (e) {
      console.error("Failed to save data to localStorage", e);
    }
  };
  
  const addToLog = (action: string, currentLog: string[]): string[] => {
    const newLogEntry = `${new Date().toISOString()} - ${action}`;
    return [newLogEntry, ...currentLog];
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000); // Refresh data every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const setStatus = (id: string, status: "approved" | "rejected") => {
    const songTitle = songs.find(s => s.id === id)?.songTitle || "Bilinmeyen Şarkı";
    const action = status === 'approved' ? 'ONAYLANDI' : 'REDDEDİLDİ';
    
    const updatedSongs = songs.map((s) => (s.id === id ? { ...s, status } : s));
    const updatedLog = addToLog(`${action}: "${songTitle}"`, log);

    saveData(updatedSongs, updatedLog);
  };
  
  const handleUpdateSong = (updatedSong: Song) => {
    const originalSong = songs.find(s => s.id === updatedSong.id);
    if (!originalSong) return;

    const changes = Object.keys(updatedSong).filter(key => key !== 'id' && key !== 'timestamp' && key !== 'status' && updatedSong[key as keyof Song] !== originalSong[key as keyof Song]).map(key => `${key}: '${originalSong[key as keyof Song]}' -> '${updatedSong[key as keyof Song]}'`).join(', ');

    const updatedSongs = songs.map(s => s.id === updatedSong.id ? updatedSong : s);
    const updatedLog = addToLog(`DÜZENLENDİ: "${originalSong.songTitle}" - Değişiklikler: ${changes}`, log);
    
    saveData(updatedSongs, updatedLog);
    setEditingSong(null);
  };

  const handleDeleteSong = (songToDelete: Song) => {
    const updatedSongs = songs.filter(s => s.id !== songToDelete.id);
    const updatedLog = addToLog(`SİLİNDİ: "${songToDelete.songTitle}" by ${songToDelete.firstName} ${songToDelete.lastName}`, log);
    
    saveData(updatedSongs, updatedLog);
    setDeletingSong(null);
  };

  const handleLinkClick = (id: string) => {
    setVisitedLinks((prev) => new Set(prev).add(id));
  };
  
  const pendingSongs = songs.filter((s) => s.status === "pending");
  const approvedSongs = songs.filter((s) => s.status === "approved");
  const rejectedSongs = songs.filter((s) => s.status === "rejected");

  const isOwner = authLevel === 'owner';

  return (
    <div className="min-h-screen p-6 relative">
      <div className="mx-auto w-[min(1100px,92%)]">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black">{isOwner ? "Sahip Paneli" : "Yönetici Paneli"}</h1>
          <div className="flex gap-2">
            <button onClick={loadData} className="rounded-2xl px-4 py-3 border border-white/20">Yenile</button>
            <button onClick={onLogout} className="rounded-2xl px-4 py-3 border border-white/20">Çıkış</button>
          </div>
        </div>
        
        <div>
          <section>
            <h2 className="text-xl font-bold mb-3 text-neutral-300">Onay Bekleyenler ({pendingSongs.length})</h2>
            <div className="grid gap-2">
              {pendingSongs.map((s) => <SongRow key={s.id} s={s} onSetStatus={setStatus} onLinkClick={handleLinkClick} visited={visitedLinks.has(s.id)} onEdit={isOwner ? () => setEditingSong(s) : undefined} onDelete={isOwner ? () => setDeletingSong(s) : undefined} />)}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-bold mb-3 text-neutral-400">Onaylananlar ({approvedSongs.length})</h2>
            <div className="grid gap-2">
              {approvedSongs.map((s) => <ReadOnlySongRow key={s.id} s={s} onEdit={isOwner ? () => setEditingSong(s) : undefined} onDelete={isOwner ? () => setDeletingSong(s) : undefined} />)}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-bold mb-3 text-neutral-500">Reddedilenler ({rejectedSongs.length})</h2>
            <div className="grid gap-2">
              {rejectedSongs.map((s) => <ReadOnlySongRow key={s.id} s={s} onEdit={isOwner ? () => setEditingSong(s) : undefined} onDelete={isOwner ? () => setDeletingSong(s) : undefined} />)}
            </div>
          </section>
          
          {isOwner && (
            <section className="mt-8">
              <h2 className="text-xl font-bold mb-3 text-neutral-600">Denetim Kaydı (Audit Log)</h2>
              <div className="bg-black/30 border border-white/10 rounded-2xl p-4 h-64 overflow-y-auto font-mono text-xs text-white/70">
                {log.length > 0 ? log.map((l, i) => <p key={i}>{l}</p>) : <p>Henüz bir aktivite yok.</p>}
              </div>
            </section>
          )}
        </div>
      </div>

      {editingSong && <EditSongModal song={editingSong} onSave={handleUpdateSong} onClose={() => setEditingSong(null)} />}
      {deletingSong && <DeleteConfirmDialog song={deletingSong} onConfirm={() => handleDeleteSong(deletingSong)} onClose={() => setDeletingSong(null)} />}
      <VHSStage intensity={0.1} sfxVolume={0.35} />
    </div>
  );
};

// --- Row Components ---
const SongRow = ({ s, onSetStatus, onLinkClick, visited, onEdit, onDelete }: { s: Song; onSetStatus: (id: string, status: "approved" | "rejected") => void; onLinkClick: (id: string) => void; visited: boolean, onEdit?: () => void, onDelete?: () => void }) => (
  <div className="border border-white/15 rounded-2xl p-3 flex justify-between items-center bg-white/5 backdrop-blur">
    <div>
      <strong>{s.firstName} {s.lastName}</strong> — {s.songTitle}
      <a href={s.songUrl} target="_blank" rel="noopener noreferrer" onClick={() => onLinkClick(s.id)} className="block text-sm text-fuchsia-300 hover:underline">
        {s.songUrl}
      </a>
    </div>
    <div className="flex gap-2 items-center">
      {onEdit && <button onClick={onEdit} className="p-2 text-white/60 hover:text-white"><Edit size={16} /></button>}
      {onDelete && <button onClick={onDelete} className="p-2 text-red-400/60 hover:text-red-400"><Trash2 size={16} /></button>}
      <button onClick={() => onSetStatus(s.id, "approved")} disabled={!visited} className="rounded-xl px-3 py-2 bg-green-500/20 disabled:bg-neutral-800/50 disabled:cursor-not-allowed text-green-300 disabled:text-white/50" title={!visited ? "Önce linke tıklayın" : "Onayla"}>Onayla</button>
      <button onClick={() => onSetStatus(s.id, "rejected")} disabled={!visited} className="rounded-xl px-3 py-2 bg-red-500/20 disabled:bg-neutral-800/50 disabled:cursor-not-allowed text-red-300 disabled:text-white/50" title={!visited ? "Önce linke tıklayın" : "Reddet"}>Reddet</button>
    </div>
  </div>
);

const ReadOnlySongRow = ({ s, onEdit, onDelete }: { s: Song; onEdit?: () => void; onDelete?: () => void; }) => (
  <div className="border border-white/15 rounded-2xl p-3 flex justify-between items-center bg-black/20 backdrop-blur opacity-70">
    <div>
      <strong>{s.firstName} {s.lastName}</strong> — {s.songTitle}
      <div className="text-sm text-white/70">{s.songUrl}</div>
    </div>
    <div className="flex items-center gap-2">
        {onEdit && <button onClick={onEdit} className="p-2 text-white/60 hover:text-white"><Edit size={16} /></button>}
        {onDelete && <button onClick={onDelete} className="p-2 text-red-400/60 hover:text-red-400"><Trash2 size={16} /></button>}
        <div className={`text-sm font-bold ${s.status === "approved" ? "text-green-400" : "text-red-400"}`}>
            {s.status === "approved" ? "Onaylandı" : "Reddedildi"}
        </div>
    </div>
  </div>
);


// --- Modals ---
const EditSongModal = ({ song, onSave, onClose }: { song: Song, onSave: (song: Song) => void, onClose: () => void }) => {
  const [formData, setFormData] = useState(song);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={onClose}>
      <div className="relative w-[min(500px,92%)] rounded-2xl border border-neutral-500/50 bg-neutral-900 p-6 shadow-2xl shadow-neutral-500/20" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">İsteği Düzenle</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-3">
            <input name="firstName" value={formData.firstName} onChange={handleChange} className="retro-input-soft" placeholder="Ad" />
            <input name="lastName" value={formData.lastName} onChange={handleChange} className="retro-input-soft" placeholder="Soyad" />
            <input name="songTitle" value={formData.songTitle} onChange={handleChange} className="retro-input-soft" placeholder="Şarkı Başlığı" />
            <input name="songUrl" value={formData.songUrl} onChange={handleChange} className="retro-input-soft" placeholder="Şarkı URL" />
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 border border-white/20">İptal</button>
            <button type="submit" className="retro-btn-soft">Kaydet</button>
          </div>
        </form>
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white"><X size={20}/></button>
      </div>
    </div>
  )
}

const DeleteConfirmDialog = ({ song, onConfirm, onClose }: { song: Song, onConfirm: () => void, onClose: () => void }) => {
  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogContent className="bg-neutral-900 border-red-500/50 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>Silme Onayı</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{song.firstName} {song.lastName}</strong> adlı kullanıcının <strong>"{song.songTitle}"</strong> şarkı isteğini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-white/20" onClick={onClose}>İptal</AlertDialogCancel>
          <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={onConfirm}>Evet, Sil</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


// --- Main Page Component ---
export default function AdminPage() {
  const [authLevel, setAuthLevel] = useState<"none" | "admin" | "owner">("none");

  // This ensures we only render the main content on the client, preventing hydration errors
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
    const storedAuth = sessionStorage.getItem("karaoke_auth");
    if (storedAuth === "owner" || storedAuth === "admin") {
      setAuthLevel(storedAuth);
    }
  }, []);

  const handleAuth = (level: "admin" | "owner") => {
    sessionStorage.setItem("karaoke_auth", level);
    setAuthLevel(level);
  }

  const handleLogout = () => {
    sessionStorage.removeItem("karaoke_auth");
    setAuthLevel("none");
  }

  if (!isClient) {
    return <div className="min-h-screen bg-black" />;
  }

  if (authLevel === "none") {
    return <LoginScreen onAuth={handleAuth} />;
  }
  
  return <AdminPanel authLevel={authLevel} onLogout={handleLogout} />;
}
