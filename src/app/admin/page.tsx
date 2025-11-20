
"use client";
import { useMemo, useState } from "react";
import {
  useCollection,
  useFirebase,
  useMemoFirebase,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from "@/firebase";
import { collection, doc, addDoc, serverTimestamp, writeBatch } from "firebase/firestore";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

type Song = {
  id: string;
  studentName: string;
  songTitle: string;
  karaokeLink: string;
  status: "pending" | "approved" | "rejected";
  createdAt: any;
};

type AuditLog = {
  id: string;
  action: string;
  songTitle: string;
  performedBy: Role;
  timestamp: any;
}

type Role = "admin" | "owner";

// --- Admin Panel Component ---
const AdminPanel = ({ role }: { role: Role }) => {
  const { firestore, user } = useFirebase();
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [deletingSong, setDeletingSong] = useState<Song | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const { toast } = useToast();

  const songRequestsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "song_requests");
  }, [firestore]);

  const auditLogsQuery = useMemoFirebase(() => {
    if (!firestore || role !== 'owner') return null;
    return collection(firestore, "audit_logs");
  }, [firestore, role]);

  const { data: songs, isLoading: songsLoading } = useCollection<Song>(songRequestsQuery);
  const { data: auditLogs, isLoading: logsLoading } = useCollection<AuditLog>(auditLogsQuery);

  const logAction = (action: string, songTitle: string) => {
    if (!firestore) return;
    const logsCollection = collection(firestore, "audit_logs");
    addDoc(logsCollection, {
      action,
      songTitle,
      performedBy: role,
      timestamp: serverTimestamp(),
    });
  };
  
  const handleBulkAdd = async () => {
    if (!firestore || !user || !bulkText.trim()) return;
    setIsBulkSubmitting(true);
    
    const lines = bulkText.trim().split('\n');
    const batch = writeBatch(firestore);
    const logsBatch = writeBatch(firestore);

    let successCount = 0;
    let errorCount = 0;

    lines.forEach(line => {
        const parts = line.split(';').map(p => p.trim());
        if (parts.length === 2) {
            const [songTitle, karaokeLink] = parts;

            if (songTitle && karaokeLink) {
                const newSongRef = doc(collection(firestore, "song_requests"));
                batch.set(newSongRef, {
                    studentName: "Sahip Tarafından Eklendi",
                    songTitle,
                    karaokeLink,
                    status: "approved",
                    createdAt: serverTimestamp(),
                    studentId: user.uid, // or a generic ID for bulk adds
                });

                const newLogRef = doc(collection(firestore, "audit_logs"));
                logsBatch.set(newLogRef, {
                  action: 'Toplu olarak eklendi ve onaylandı',
                  songTitle: songTitle,
                  performedBy: role,
                  timestamp: serverTimestamp(),
                });
                successCount++;
            } else {
                errorCount++;
            }
        } else {
            errorCount++;
        }
    });

    try {
        await batch.commit();
        await logsBatch.commit();
        toast({
            title: "Toplu Ekleme Başarılı",
            description: `${successCount} şarkı başarıyla eklendi. Hatalı satır sayısı: ${errorCount}.`,
        });
        setBulkText("");
    } catch (error) {
        console.error("Bulk add failed:", error);
        toast({
            variant: "destructive",
            title: "Toplu Ekleme Başarısız",
            description: "Şarkılar eklenirken bir hata oluştu.",
        });
    } finally {
        setIsBulkSubmitting(false);
    }
};


  const setStatus = (song: Song, status: "approved" | "rejected" | "pending") => {
    if (!firestore) return;
    const songRef = doc(firestore, "song_requests", song.id);
    updateDocumentNonBlocking(songRef, { status });
    logAction(`Durum "${status}" olarak değiştirildi`, song.songTitle);
  };

  const handleDelete = () => {
    if (!firestore || !deletingSong) return;
    const songRef = doc(firestore, "song_requests", deletingSong.id);
    deleteDocumentNonBlocking(songRef);
    logAction('Silindi', deletingSong.songTitle);
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
    logAction('Düzenlendi', editingSong.songTitle);
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

  const sortedLogs = useMemo(() => {
    if (!auditLogs) return [];
    return [...auditLogs].sort((a, b) => {
      const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(0);
      const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [auditLogs]);

  const pendingSongs = sortedSongs.filter((s) => s.status === "pending");
  const approvedSongs = sortedSongs.filter((s) => s.status === "approved");
  const rejectedSongs = sortedSongs.filter((s) => s.status === "rejected");
  const title = role === "owner" ? "Sahip Paneli" : "Yönetici Paneli";
  const isLoading = songsLoading || (role === 'owner' && logsLoading);

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
          <Tabs defaultValue="requests">
            <TabsList>
              <TabsTrigger value="requests">Şarkı İstekleri</TabsTrigger>
              {role === 'owner' && <TabsTrigger value="bulk-add">Toplu Ekle</TabsTrigger>}
              {role === 'owner' && <TabsTrigger value="audit">Denetim Kayıtları</TabsTrigger>}
            </TabsList>
            <TabsContent value="requests" className="mt-6">
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
                      onSetStatus={setStatus}
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
                      onSetStatus={setStatus}
                      onEdit={() => setEditingSong(s)}
                      onDelete={() => setDeletingSong(s)}
                    />
                  ))}
                </div>
              </section>
            </TabsContent>
             {role === 'owner' && (
              <TabsContent value="bulk-add" className="mt-6">
                 <h2 className="text-xl font-bold mb-3 text-neutral-300">
                  Şarkıları Toplu Ekle
                </h2>
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-neutral-400">
                        Excel veya Google E-Tablolar'dan kopyaladığınız şarkı listesini aşağıya yapıştırın. Her satır bir şarkı olmalı ve şu formatta olmalıdır: <br />
                        <code className="bg-white/10 px-2 py-1 rounded-md text-fuchsia-300">Şarkı Adı;Karaoke Linki</code>
                    </p>
                    <Textarea
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        placeholder="Kuzu Kuzu;https://youtube.com/..."
                        className="retro-input-soft min-h-[200px]"
                        rows={10}
                    />
                    <div className="flex justify-end">
                        <Button onClick={handleBulkAdd} disabled={isBulkSubmitting}>
                            {isBulkSubmitting ? "Ekleniyor..." : "Listeyi Ekle"}
                        </Button>
                    </div>
                </div>
              </TabsContent>
            )}
            {role === 'owner' && (
              <TabsContent value="audit" className="mt-6">
                 <h2 className="text-xl font-bold mb-3 text-neutral-300">
                  Son Hareketler
                </h2>
                <div className="grid gap-2">
                  {sortedLogs.map(log => (
                    <div key={log.id} className="border border-white/15 rounded-2xl p-3 bg-white/5 backdrop-blur text-sm">
                      <span className="font-bold text-fuchsia-300">{log.songTitle}</span> - <span className="text-neutral-300">{log.action}</span>
                      <div className="text-xs text-neutral-400 mt-1">
                        {log.performedBy === 'owner' ? 'Sahip' : 'Yönetici'} tarafından, {log.timestamp?.toDate ? formatDistanceToNow(log.timestamp.toDate(), { addSuffix: true, locale: tr }) : 'az önce'}.
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
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
  onSetStatus: (song: Song, status: "approved" | "rejected") => void;
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
        onClick={() => onSetStatus(s, "approved")}
        className="rounded-xl px-3 py-2 bg-green-500/20 text-green-300"
      >
        Onayla
      </button>
      <button
        onClick={() => onSetStatus(s, "rejected")}
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
  onSetStatus,
  onEdit,
  onDelete,
}: {
  s: Song;
  role: Role;
  onSetStatus: (song: Song, status: "approved" | "rejected" | "pending") => void;
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
      {role === "owner" ? (
         <div className="flex gap-2 items-center">
            <button
              onClick={() => onSetStatus(s, "approved")}
              className="rounded-xl px-3 py-2 bg-green-500/20 text-green-300 text-xs"
            >
              Onayla
            </button>
            <button
              onClick={() => onSetStatus(s, "rejected")}
              className="rounded-xl px-3 py-2 bg-red-500/20 text-red-300 text-xs"
            >
              Reddet
            </button>
             <button
              onClick={() => onSetStatus(s, "pending")}
              className="rounded-xl px-3 py-2 bg-yellow-500/20 text-yellow-300 text-xs"
            >
              Beklemeye Al
            </button>
        </div>
      ) : (
        <div
            className={`text-sm font-bold ${
            s.status === "approved" ? "text-green-400" : "text-red-400"
            }`}
        >
            {s.status === "approved" ? "Onaylandı" : "Reddedildi"}
        </div>
      )}
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
const LoginForm = ({ onLogin, error }: { onLogin: (password: string) => void, error: string | null }) => {
  const [password, setPassword] = useState("");

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
            onChange={(e) => setPassword(e.target.value)}
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
    return <LoginForm onLogin={handleLogin} error={error} />;
  }

  return <AdminPanel role={role} />;
}
