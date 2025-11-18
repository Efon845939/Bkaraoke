
"use client";
import { useEffect, useState, useCallback } from "react";
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
  timestamp: number;
};

type AuditLog = {
  id: string;
  timestamp: number;
  user: "admin" | "owner";
  action: string;
  details: string;
};

const STORAGE_KEY_SONGS = "karaoke_requests_offline";
const STORAGE_KEY_LOGS = "karaoke_audit_logs_offline";
const ADMIN_PASS = "kara90ke";
const OWNER_PASS = "gizli_kara90ke";

// --- Data Layer ---
function loadFromStorage<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function saveToStorage<T>(key: string, data: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

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
    </div>
  );
};


// --- Admin Panel Component ---
const AdminPanel = ({ authLevel, onLogout }: { authLevel: "admin" | "owner", onLogout: () => void }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [load, setLoad] = useState(true);
  const [visitedLinks, setVisitedLinks] = useState<Set<string>>(new Set());
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [deletingSong, setDeletingSong] = useState<Song | null>(null);

  const addLog = useCallback((action: string, details: string) => {
    if (authLevel !== 'owner') return;
    const newLog: AuditLog = { id: crypto.randomUUID(), timestamp: Date.now(), user: authLevel, action, details };
    const currentLogs = loadFromStorage<AuditLog>(STORAGE_KEY_LOGS);
    const updatedLogs = [newLog, ...currentLogs];
    saveToStorage<AuditLog>(STORAGE_KEY_LOGS, updatedLogs);
    setLogs(updatedLogs);
  }, [authLevel]);

  const loadData = useCallback(() => {
    setLoad(true);
    const loadedSongs = loadFromStorage<Song>(STORAGE_KEY_SONGS);
    loadedSongs.sort((a, b) => b.timestamp - a.timestamp);
    setSongs(loadedSongs);
    if(authLevel === 'owner') {
      const loadedLogs = loadFromStorage<AuditLog>(STORAGE_KEY_LOGS);
      loadedLogs.sort((a, b) => b.timestamp - a.timestamp);
      setLogs(loadedLogs);
    }
    setLoad(false);
  }, [authLevel]);

  const setStatus = (id: string, status: "approved" | "rejected") => {
    const updatedSongs = songs.map((song) => {
      if (song.id === id) {
        addLog(`Status Change: ${status}`, `${song.firstName}'s song "${song.songTitle}"`);
        return { ...song, status: status };
      }
      return song;
    });
    saveToStorage<Song>(STORAGE_KEY_SONGS, updatedSongs);
    setSongs(updatedSongs);
  };
  
  const handleUpdateSong = (updatedSong: Song) => {
    const updatedSongs = songs.map((song) => {
      if (song.id === updatedSong.id) {
        addLog(`Entry Edited`, `${song.firstName}'s song was edited.`);
        return updatedSong;
      }
      return song;
    });
    saveToStorage(STORAGE_KEY_SONGS, updatedSongs);
    setSongs(updatedSongs);
    setEditingSong(null);
  };

  const handleDeleteSong = (songToDelete: Song) => {
    addLog(`Entry Deleted`, `${songToDelete.firstName}'s song "${songToDelete.songTitle}" was permanently deleted.`);
    const updatedSongs = songs.filter((s) => s.id !== songToDelete.id);
    saveToStorage(STORAGE_KEY_SONGS, updatedSongs);
    setSongs(updatedSongs);
    setDeletingSong(null);
  };


  useEffect(() => {
    loadData();
  }, [loadData]);


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
          <h1 className="text-2xl font-black">{isOwner ? "Sahip Paneli (Çevrimdışı)" : "Yönetici Paneli (Çevrimdışı)"}</h1>
          <div className="flex gap-2">
            <button onClick={loadData} className="retro-btn-soft vhs-interact">{load ? "Yükleniyor…" : "Yenile"}</button>
            <button onClick={onLogout} className="rounded-2xl px-4 py-3 border border-white/20">Çıkış</button>
          </div>
        </div>
        
        {load ? <p>Yükleniyor...</p> : (
            <div className={isOwner ? "grid grid-cols-1 lg:grid-cols-2 gap-8" : ""}>
            <div>
              <section>
                <h2 className="text-xl font-bold mb-3 text-neutral-300">Onay Bekleyenler ({pendingSongs.length})</h2>
                <div className="grid gap-2">
                  {pendingSongs.length > 0 ? (
                    pendingSongs.map((s) => <SongRow key={s.id} s={s} onSetStatus={setStatus} onLinkClick={handleLinkClick} visited={visitedLinks.has(s.id)} onEdit={isOwner ? () => setEditingSong(s) : undefined} onDelete={isOwner ? () => setDeletingSong(s) : undefined} />)
                  ) : (
                    <p className="text-white/70">Onay bekleyen istek yok.</p>
                  )}
                </div>
              </section>
  
              <section className="mt-8">
                <h2 className="text-xl font-bold mb-3 text-neutral-400">Onaylananlar ({approvedSongs.length})</h2>
                <div className="grid gap-2">
                  {approvedSongs.length > 0 ? (
                    approvedSongs.map((s) => <ReadOnlySongRow key={s.id} s={s} onEdit={isOwner ? () => setEditingSong(s) : undefined} onDelete={isOwner ? () => setDeletingSong(s) : undefined} />)
                  ) : (
                    <p className="text-white/70">Henüz onaylanan istek yok.</p>
                  )}
                </div>
              </section>
  
              <section className="mt-8">
                <h2 className="text-xl font-bold mb-3 text-neutral-500">Reddedilenler ({rejectedSongs.length})</h2>
                <div className="grid gap-2">
                  {rejectedSongs.length > 0 ? (
                    rejectedSongs.map((s) => <ReadOnlySongRow key={s.id} s={s} onEdit={isOwner ? () => setEditingSong(s) : undefined} onDelete={isOwner ? () => setDeletingSong(s) : undefined} />)
                  ) : (
                    <p className="text-white/70">Henüz reddedilen istek yok.</p>
                  )}
                </div>
              </section>
            </div>
            
            {isOwner && (
              <section>
                <h2 className="text-xl font-bold mb-3 text-neutral-300">Denetim Kayıtları (Audit Logs)</h2>
                <div className="grid gap-2 max-h-[80vh] overflow-y-auto pr-2">
                  {logs.length > 0 ? (
                    logs.map((log) => <AuditLogRow key={log.id} log={log} />)
                  ) : (
                    <p className="text-white/70">Henüz denetim kaydı yok.</p>
                  )}
                </div>
              </section>
            )}
          </div>
        )}

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
      <a href={s.songUrl} target="_blank" rel="noopener noreferrer" onClick={() => onLinkClick(s.id)} className="block text-sm text-neutral-400 hover:underline">
        {s.songUrl}
      </a>
    </div>
    <div className="flex gap-2 items-center">
      {onEdit && <button onClick={onEdit} className="p-2 text-white/60 hover:text-white"><Edit size={16} /></button>}
      {onDelete && <button onClick={onDelete} className="p-2 text-red-400/60 hover:text-red-400"><Trash2 size={16} /></button>}
      <button onClick={() => onSetStatus(s.id, "approved")} disabled={!visited} className="rounded-xl px-3 py-2 bg-neutral-600 disabled:bg-neutral-800/50 disabled:cursor-not-allowed text-white disabled:text-white/50" title={!visited ? "Önce linke tıklayın" : "Onayla"}>Onayla</button>
      <button onClick={() => onSetStatus(s.id, "rejected")} disabled={!visited} className="rounded-xl px-3 py-2 bg-neutral-700 disabled:bg-neutral-800/50 disabled:cursor-not-allowed text-white/80 disabled:text-white/50" title={!visited ? "Önce linke tıklayın" : "Reddet"}>Reddet</button>
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
        <div className={`text-sm font-bold ${s.status === "approved" ? "text-neutral-300" : "text-neutral-500"}`}>
            {s.status === "approved" ? "Onaylandı" : "Reddedildi"}
        </div>
    </div>
  </div>
);

const AuditLogRow = ({ log }: { log: AuditLog }) => (
  <div className="border-b border-white/10 p-2 text-sm">
      <div className="flex justify-between">
          <span className="font-semibold text-white/90">{log.action} <span className="font-normal text-neutral-400">({log.user})</span></span>
          <span className="text-white/50">{new Date(log.timestamp).toLocaleString('tr-TR')}</span>
      </div>
      <p className="text-white/70 mt-1">{log.details}</p>
  </div>
);

// --- Modals ---
const EditSongModal = ({ song, onSave, onClose }: { song: Song, onSave: (song: Song) => void, onClose: () => void }) => {
  const [formData, setFormData] = useState(song);
  
  useEffect(() => {
    setFormData(song);
  }, [song]);

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
      <div className="relative w-[min(500px,92%)] rounded-2xl border border-neutral-500/50 bg-black p-6 shadow-2xl shadow-neutral-500/20" onClick={e => e.stopPropagation()}>
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
      <AlertDialogContent className="bg-black border-red-500/50 text-white">
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

  useEffect(() => {
    // This effect ensures we only check for auth state on the client side
    // preventing hydration errors.
  }, []);

  const MainContent = () => {
    if (authLevel === "none") {
      return <LoginScreen onAuth={setAuthLevel} />;
    }
    return <AdminPanel authLevel={authLevel} onLogout={() => setAuthLevel("none")} />;
  };

  return (
    <>
      <MainContent />
    </>
  );
}
