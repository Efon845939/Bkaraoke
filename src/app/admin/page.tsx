
"use client";
import { useMemo, useState } from "react";
import {
  useCollection,
  useFirebase,
  useMemoFirebase,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from "@/firebase";
import { collection, doc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { Edit, Trash2 } from "lucide-react";
import VHSStage from "@/components/VHSStage";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Song = {
  id: string;
  studentName: string;
  songTitle: string;
  karaokeLink: string;
  status: "pending" | "approved" | "rejected";
  createdAt: any;
};

type Role = "admin" | "owner";

// --- Admin Panel Component ---
const AdminPanel = ({ role }: { role: Role }) => {
  const { firestore } = useFirebase();
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [deletingSong, setDeletingSong] = useState<Song | null>(null);

  const songRequestsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "song_requests");
  }, [firestore]);

  const { data: songs, isLoading } = useCollection<Song>(songRequestsQuery);

  const setStatus = (id: string, status: "approved" | "rejected") => {
    if (!firestore) return;
    const songRef = doc(firestore, "song_requests", id);
    updateDocumentNonBlocking(songRef, { status });
  };

  const handleDelete = () => {
    if (!firestore || !deletingSong) return;
    const songRef = doc(firestore, "song_requests", deletingSong.id);
    deleteDocumentNonBlocking(songRef);
    setDeletingSong(null);
  };
  
  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !editingSong) return;
    const formData = new FormData(e.currentTarget);
    const updatedSong = {
        studentName: formData.get("studentName") as string,
        songTitle: formData.get("songTitle") as string,
        karaokeLink: formData.get("karaokeLink") as string,
    };
    const songRef = doc(firestore, "song_requests", editingSong.id);
    updateDocumentNonBlocking(songRef, updatedSong);
    setEditingSong(null);
  };

  const sortedSongs = useMemo(() => {
    if (!songs) return [];
    return [...songs].sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [songs]);

  const pendingSongs = sortedSongs.filter((s) => s.status === "pending");
  const approvedSongs = sortedSongs.filter((s) => s.status === "approved");
  const rejectedSongs = sortedSongs.filter((s) => s.status === "rejected");
  const title = role === "owner" ? "Sahip Paneli" : "Yönetici Paneli";

  return (
    <div className="min-h-screen p-6 relative">
      <div className="mx-auto w-[min(1100px,92%)]">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black">{title}</h1>
          <Link
            href="/"
            className="rounded-2xl px-4 py-3 border border-white/20"
          >
            Lobiye Dön
          </Link>
        </div>

        {isLoading && <p>Yükleniyor...</p>}

        {!isLoading && (
          <div>
            <section>
              <h2 className="text-xl font-bold mb-3 text-neutral-300">
                Onay Bekleyenler ({pendingSongs.length})
              </h2>
              <div className="grid gap-2">
                {pendingSongs.map((s) => (
                  <SongRow
                    key={s.id}
                    s={s}
                    role={role}
                    onSetStatus={setStatus}
                    onEdit={() => setEditingSong(s)}
                    onDelete={() => setDeletingSong(s)}
                  />
                ))}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-bold mb-3 text-neutral-400">
                Onaylananlar ({approvedSongs.length})
              </h2>
              <div className="grid gap-2">
                {approvedSongs.map((s) => (
                  <ReadOnlySongRow
                    key={s.id}
                    s={s}
                    role={role}
                    onEdit={() => setEditingSong(s)}
                    onDelete={() => setDeletingSong(s)}
                  />
                ))}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-bold mb-3 text-neutral-500">
                Reddedilenler ({rejectedSongs.length})
              </h2>
              <div className="grid gap-2">
                {rejectedSongs.map((s) => (
                  <ReadOnlySongRow
                    key={s.id}
                    s={s}
                    role={role}
                    onEdit={() => setEditingSong(s)}
                    onDelete={() => setDeletingSong(s)}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      <VHSStage intensity={0.1} sfxVolume={0} />

      {/* Edit Dialog */}
      <AlertDialog open={!!editingSong} onOpenChange={(open) => !open && setEditingSong(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Şarkıyı Düzenle</AlertDialogTitle>
            <AlertDialogDescription>Şarkı detaylarını güncelleyin.</AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleEdit}>
            <div className="flex flex-col gap-4 py-4">
                <Input name="studentName" defaultValue={editingSong?.studentName} placeholder="İsim" />
                <Input name="songTitle" defaultValue={editingSong?.songTitle} placeholder="Şarkı Başlığı" />
                <Input name="karaokeLink" defaultValue={editingSong?.karaokeLink} placeholder="Karaoke Linki" />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction type="submit">Kaydet</AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingSong} onOpenChange={(open) => !open && setDeletingSong(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                <AlertDialogDescription>
                    Bu işlem geri alınamaz. "{deletingSong?.songTitle}" şarkısını listeden kalıcı olarak sileceksiniz.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>İptal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Sil</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// --- Row Components ---
const SongRow = ({
  s,
  role,
  onSetStatus,
  onEdit,
  onDelete,
}: {
  s: Song;
  role: Role;
  onSetStatus: (id: string, status: "approved" | "rejected") => void;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <div className="border border-white/15 rounded-2xl p-3 flex justify-between items-center bg-white/5 backdrop-blur">
    <div>
      <strong>{s.studentName}</strong> — {s.songTitle}
      <a
        href={s.karaokeLink}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-sm text-fuchsia-300 hover:underline"
      >
        {s.karaokeLink}
      </a>
    </div>
    <div className="flex gap-2 items-center">
      <button
        onClick={() => onSetStatus(s.id, "approved")}
        className="rounded-xl px-3 py-2 bg-green-500/20 text-green-300"
      >
        Onayla
      </button>
      <button
        onClick={() => onSetStatus(s.id, "rejected")}
        className="rounded-xl px-3 py-2 bg-red-500/20 text-red-300"
      >
        Reddet
      </button>
      {role === "owner" && (
        <>
          <Button onClick={onEdit} size="icon" variant="ghost" className="h-8 w-8">
            <Edit className="h-4 w-4" />
          </Button>
          <Button onClick={onDelete} size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300">
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  </div>
);

const ReadOnlySongRow = ({
  s,
  role,
  onEdit,
  onDelete,
}: {
  s: Song;
  role: Role;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <div className="border border-white/15 rounded-2xl p-3 flex justify-between items-center bg-black/20 backdrop-blur opacity-70">
    <div>
      <strong>{s.studentName}</strong> — {s.songTitle}
      <a
        href={s.karaokeLink}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-sm text-fuchsia-300 hover:underline"
      >
        {s.karaokeLink}
      </a>
    </div>
    <div className="flex items-center gap-2">
      <div
        className={`text-sm font-bold ${
          s.status === "approved" ? "text-green-400" : "text-red-400"
        }`}
      >
        {s.status === "approved" ? "Onaylandı" : "Reddedildi"}
      </div>
      {role === "owner" && (
        <>
          <Button onClick={onEdit} size="icon" variant="ghost" className="h-8 w-8">
            <Edit className="h-4 w-4" />
          </Button>
          <Button onClick={onDelete} size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300">
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  </div>
);

// --- Login Form Component ---
const LoginForm = ({ onLogin }: { onLogin: (password: string) => void }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(password);
  };

  return (
    <div className="min-h-screen grid place-items-center relative">
      <div className="mx-auto w-[min(400px,90%)]">
        <h1 className="text-2xl font-black mb-4">Erişim Paneli</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            placeholder="Parola"
            className="retro-input-soft"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" className="retro-btn-soft">
            Giriş Yap
          </button>
          <Link
            href="/"
            className="text-center text-sm text-neutral-400 hover:underline mt-2"
          >
            Lobiye Dön
          </Link>
        </form>
      </div>
      <VHSStage intensity={0.1} sfxVolume={0.35} />
    </div>
  );
};

// --- Main Page Component ---
export default function AdminPage() {
  const { firestore } = useFirebase();
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleLogin = (password: string) => {
    if (password === "gizli_kara90ke") {
      setRole("owner");
      setError(null);
    } else if (password === "kara90ke") {
      setRole("admin");
      setError(null);
    } else {
      setError("Yanlış parola.");
    }
  };

  if (!firestore) {
    return <div className="min-h-screen bg-black" />;
  }

  if (!role) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return <AdminPanel role={role} />;
}

    