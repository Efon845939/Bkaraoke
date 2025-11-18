
"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
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
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, updateDoc, deleteDoc, Timestamp, query, orderBy } from "firebase/firestore";
import { WithId } from "@/firebase/firestore/use-collection";


type Song = {
  firstName: string;
  lastName: string;
  songTitle: string;
  songUrl: string;
  status: "pending" | "approved" | "rejected";
  timestamp: Timestamp;
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
    <div className="min-h-screen grid place-items-center relative bg-black">
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
  const { firestore } = useFirebase();

  const songsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "song_requests"), orderBy("timestamp", "desc"));
  }, [firestore]);

  const { data: songs, isLoading } = useCollection<Song>(songsQuery);

  const [visitedLinks, setVisitedLinks] = useState<Set<string>>(new Set());
  const [editingSong, setEditingSong] = useState<WithId<Song> | null>(null);
  const [deletingSong, setDeletingSong] = useState<WithId<Song> | null>(null);

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    if (!firestore) return;
    const songRef = doc(firestore, "song_requests", id);
    try {
      await updateDoc(songRef, { status });
    } catch (e) {
      console.error("Status update failed: ", e);
    }
  };
  
  const handleUpdateSong = async (updatedSong: WithId<Song>) => {
    if (!firestore) return;
    const { id, ...songData } = updatedSong;
    const songRef = doc(firestore, "song_requests", id);
    try {
      await updateDoc(songRef, songData);
    } catch(e) {
       console.error("Song update failed: ", e);
    }
    setEditingSong(null);
  };

  const handleDeleteSong = async (songToDelete: WithId<Song>) => {
    if (!firestore) return;
    const songRef = doc(firestore, "song_requests", songToDelete.id);
    try {
      await deleteDoc(songRef);
    } catch (e) {
      console.error("Song deletion failed: ", e);
    }
    setDeletingSong(null);
  };

  const handleLinkClick = (id: string) => {
    setVisitedLinks((prev) => new Set(prev).add(id));
  };
  
  const pendingSongs = useMemo(() => songs?.filter((s) => s.status === "pending") || [], [songs]);
  const approvedSongs = useMemo(() => songs?.filter((s) => s.status === "approved") || [], [songs]);
  const rejectedSongs = useMemo(() => songs?.filter((s) => s.status === "rejected") || [], [songs]);

  const isOwner = authLevel === 'owner';

  return (
    <div className="min-h-screen p-6 relative bg-black">
      <div className="mx-auto w-[min(1100px,92%)]">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black">{isOwner ? "Sahip Paneli" : "Yönetici Paneli"}</h1>
          <div className="flex gap-2">
            <button onClick={onLogout} className="rounded-2xl px-4 py-3 border border-white/20">Çıkış</button>
          </div>
        </div>
        
        {isLoading ? <p className="text-white/70">İstekler yükleniyor...</p> : (
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
        )}
      </div>

      {editingSong && <EditSongModal song={editingSong} onSave={handleUpdateSong} onClose={() => setEditingSong(null)} />}
      {deletingSong && <DeleteConfirmDialog song={deletingSong} onConfirm={() => handleDeleteSong(deletingSong)} onClose={() => setDeletingSong(null)} />}
      <VHSStage intensity={0.1} sfxVolume={0.35} />
    </div>
  );
};

// --- Row Components ---
const SongRow = ({ s, onSetStatus, onLinkClick, visited, onEdit, onDelete }: { s: WithId<Song>; onSetStatus: (id: string, status: "approved" | "rejected") => void; onLinkClick: (id: string) => void; visited: boolean, onEdit?: () => void, onDelete?: () => void }) => (
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

const ReadOnlySongRow = ({ s, onEdit, onDelete }: { s: WithId<Song>; onEdit?: () => void; onDelete?: () => void; }) => (
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


// --- Modals ---
const EditSongModal = ({ song, onSave, onClose }: { song: WithId<Song>, onSave: (song: WithId<Song>) => void, onClose: () => void }) => {
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
              <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 border border-white/20">İptal</button>              <button type="submit" className="retro-btn-soft">Kaydet</button>
            </div>
        </form>
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white"><X size={20}/></button>
      </div>
    </div>
  )
}

const DeleteConfirmDialog = ({ song, onConfirm, onClose }: { song: WithId<Song>, onConfirm: () => void, onClose: () => void }) => {
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

  // This ensures we only render the main content on the client, preventing hydration errors
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="min-h-screen bg-black" />;
  }

  if (authLevel === "none") {
    return <LoginScreen onAuth={setAuthLevel} />;
  }
  
  return <AdminPanel authLevel={authLevel} onLogout={() => setAuthLevel("none")} />;
}
