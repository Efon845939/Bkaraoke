
"use client";
import { useMemo, useState } from "react";
import VHSStage from "@/components/VHSStage";
import Link from "next/link";
import {
  useCollection,
  useFirebase,
  useMemoFirebase,
} from "@/firebase";
import { collection, doc, updateDoc } from "firebase/firestore";

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
    return collection(firestore, "song_requests");
  }, [firestore]);

  const { data: songs, isLoading } = useCollection<Song>(songRequestsQuery);

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    if (!firestore) return;
    const songRef = doc(firestore, "song_requests", id);
    await updateDoc(songRef, { status });
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
                  <SongRow key={s.id} s={s} onSetStatus={setStatus} />
                ))}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-bold mb-3 text-neutral-400">
                Onaylananlar ({approvedSongs.length})
              </h2>
              <div className="grid gap-2">
                {approvedSongs.map((s) => (
                  <ReadOnlySongRow key={s.id} s={s} />
                ))}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-bold mb-3 text-neutral-500">
                Reddedilenler ({rejectedSongs.length})
              </h2>
              <div className="grid gap-2">
                {rejectedSongs.map((s) => (
                  <ReadOnlySongRow key={s.id} s={s} />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      <VHSStage intensity={0.1} sfxVolume={0} />
    </div>
  );
};

// --- Row Components ---
const SongRow = ({
  s,
  onSetStatus,
}: {
  s: Song;
  onSetStatus: (id: string, status: "approved" | "rejected") => void;
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
    </div>
  </div>
);

const ReadOnlySongRow = ({ s }: { s: Song }) => (
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
    </div>
  </div>
);


// --- Login Form Component ---
const LoginForm = ({ onLogin }: { onLogin: (password: string) => void }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "owner") {
      onLogin(password);
    } else {
      setError("Yanlış parola.");
    }
  };

  return (
    <div className="min-h-screen grid place-items-center relative">
        <div className="mx-auto w-[min(400px,90%)]">
            <h1 className="text-2xl font-black mb-4">Yönetici Girişi</h1>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Parola"
                    className="retro-input-soft"
                />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button type="submit" className="retro-btn-soft">Giriş Yap</button>
                 <Link href="/" className="text-center text-sm text-neutral-400 hover:underline mt-2">
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const handleLogin = (password: string) => {
      // For now, we just check a hardcoded password.
      // In a real app, this would involve a proper auth system.
      if (password === "owner") {
          setIsAuthenticated(true);
      }
  };

  // If firebase is not initialized, show a loading screen or nothing
  if (!firestore) {
    return <div className="min-h-screen bg-black" />;
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }
  
  return <AdminPanel />;
}
