
"use client";
import { useMemo, useState } from "react";
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
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

type Song = {
  id: string;
  studentName: string;
  songTitle: string;
  karaokeLink: string;
  status: "pending" | "approved" | "rejected";
  createdAt: any;
};

// --- Admin Panel Component ---
const AdminPanel = () => {
  const { firestore } = useFirebase();

  const songRequestsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'song_requests');
  }, [firestore]);

  const { data: songs, isLoading } = useCollection<Song>(songRequestsQuery);

  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [deletingSong, setDeletingSong] = useState<Song | null>(null);

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    if (!firestore) return;
    const songRef = doc(firestore, "song_requests", id);
    await updateDoc(songRef, { status });
  };
  
  const handleUpdateSong = async (updatedSong: Song) => {
    if (!firestore || !editingSong) return;
    const songRef = doc(firestore, "song_requests", editingSong.id);
    await updateDoc(songRef, {
        studentName: updatedSong.studentName,
        songTitle: updatedSong.songTitle,
        karaokeLink: updatedSong.karaokeLink,
    });
    setEditingSong(null);
  };

  const handleDeleteSong = async (songToDelete: Song) => {
    if (!firestore || !songToDelete) return;
    const songRef = doc(firestore, "song_requests", songToDelete.id);
    await deleteDoc(songRef);
    setDeletingSong(null);
  };
  
  const sortedSongs = useMemo(() => {
    if (!songs) return [];
    // Firestore timestamp objelerini Date objelerine çevirip sırala
    return [...songs].sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dateB.getTime() - dateA.getTime();
    });
  }, [songs]);

  const pendingSongs = sortedSongs.filter((s) => s.status === "pending");
  const approvedSongs = sortedSongs.filter((s) => s.status === "approved");
  const rejectedSongs = sortedSongs.filter((s) => s.status === "rejected");

  return (
    <div className="min-h-screen p-6 relative">
      <div className="mx-auto w-[min(1100px,92%)]">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black">Yönetici Paneli</h1>
          <Link href="/" className="rounded-2xl px-4 py-3 border border-white/20">Lobiye Dön</Link>
        </div>
        
        {isLoading && <p>Yükleniyor...</p>}

        {!isLoading && (
            <div>
            <section>
                <h2 className="text-xl font-bold mb-3 text-neutral-300">Onay Bekleyenler ({pendingSongs.length})</h2>
                <div className="grid gap-2">
                {pendingSongs.map((s) => <SongRow key={s.id} s={s} onSetStatus={setStatus} onEdit={() => setEditingSong(s)} onDelete={() => setDeletingSong(s)} />)}
                </div>
            </section>

            <section className="mt-8">
                <h2 className="text-xl font-bold mb-3 text-neutral-400">Onaylananlar ({approvedSongs.length})</h2>
                <div className="grid gap-2">
                {approvedSongs.map((s) => <ReadOnlySongRow key={s.id} s={s} onEdit={() => setEditingSong(s)} onDelete={() => setDeletingSong(s)} />)}
                </div>
            </section>

            <section className="mt-8">
                <h2 className="text-xl font-bold mb-3 text-neutral-500">Reddedilenler ({rejectedSongs.length})</h2>
                <div className="grid gap-2">
                {rejectedSongs.map((s) => <ReadOnlySongRow key={s.id} s={s} onEdit={() => setEditingSong(s)} onDelete={() => setDeletingSong(s)} />)}
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
const SongRow = ({ s, onSetStatus, onEdit, onDelete }: { s: Song; onSetStatus: (id: string, status: "approved" | "rejected") => void; onEdit?: () => void, onDelete?: () => void }) => (
  <div className="border border-white/15 rounded-2xl p-3 flex justify-between items-center bg-white/5 backdrop-blur">
    <div>
      <strong>{s.studentName}</strong> — {s.songTitle}
      <a href={s.karaokeLink} target="_blank" rel="noopener noreferrer" className="block text-sm text-fuchsia-300 hover:underline">
        {s.karaokeLink}
      </a>
    </div>
    <div className="flex gap-2 items-center">
      {onEdit && <button onClick={onEdit} className="p-2 text-white/60 hover:text-white"><Edit size={16} /></button>}
      {onDelete && <button onClick={onDelete} className="p-2 text-red-400/60 hover:text-red-400"><Trash2 size={16} /></button>}
      <button onClick={() => onSetStatus(s.id, "approved")} className="rounded-xl px-3 py-2 bg-green-500/20 text-green-300">Onayla</button>
      <button onClick={() => onSetStatus(s.id, "rejected")} className="rounded-xl px-3 py-2 bg-red-500/20 text-red-300">Reddet</button>
    </div>
  </div>
);

const ReadOnlySongRow = ({ s, onEdit, onDelete }: { s: Song; onEdit?: () => void; onDelete?: () => void; }) => (
  <div className="border border-white/15 rounded-2xl p-3 flex justify-between items-center bg-black/20 backdrop-blur opacity-70">
    <div>
      <strong>{s.studentName}</strong> — {s.songTitle}
      <div className="text-sm text-white/70">{s.karaokeLink}</div>
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
  const [formData, setFormData] = useState({studentName: song.studentName, songTitle: song.songTitle, karaokeLink: song.karaokeLink});
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({...song, ...formData});
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={onClose}>
      <div className="relative w-[min(500px,92%)] rounded-2xl border border-neutral-500/50 bg-neutral-900 p-6 shadow-2xl shadow-neutral-500/20" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">İsteği Düzenle</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-3">
            <input name="studentName" value={formData.studentName} onChange={handleChange} className="retro-input-soft" placeholder="Öğrenci/Öğretmen Adı Soyadı" />
            <input name="songTitle" value={formData.songTitle} onChange={handleChange} className="retro-input-soft" placeholder="Şarkı Başlığı" />
            <input name="karaokeLink" value={formData.karaokeLink} onChange={handleChange} className="retro-input-soft" placeholder="Şarkı URL" />
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
            <strong>{song.studentName}</strong> adlı kullanıcının <strong>"{song.songTitle}"</strong> şarkı isteğini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
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
  const { firestore } = useFirebase();

  // If firebase is not initialized, show a loading screen or nothing
  if (!firestore) {
    return <div className="min-h-screen bg-black" />;
  }
  
  return <AdminPanel />;
}
