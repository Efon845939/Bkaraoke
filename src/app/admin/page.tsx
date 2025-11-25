
"use client";
import { useMemo, useState } from "react";
import {
  useCollection,
  useFirebase,
  useMemoFirebase,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  useUser,
} from "@/firebase";
import { collection, doc, addDoc, serverTimestamp, writeBatch, getDocs, deleteDoc } from "firebase/firestore";
import Link from "next/link";
import { Edit, Trash2, AlertTriangle } from "lucide-react";
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
  const [bulkText, setBulkText] = useState(
`REM-Losing my religion;https://www.youtube.com/watch?v=gCrqBZlxSyA
Bulutsuzluk Özlemi-Sözlerimi geri alamam;https://www.youtube.com/watch?v=jHULD4aZnS0
Şebnem Ferah-Sil Baştan;https://www.youtube.com/watch?v=MGKQpfWrBx0&list=RDMGKQpfWrBx0&start_radio=1
Gülşen-Be Adam;https://www.youtube.com/watch?v=AyXlebMMAWE&list=RDAyXlebMMAWE&start_radio=1
Tarkan-Hepsi Senin Mi?;https://www.youtube.com/watch?v=20azTn_qfuE&list=RD20azTn_qfuE&start_radio=1
Kenan Doğulu -Yaparım Bilirsin(hızlı Ebru Gündeş versiyon);https://www.youtube.com/watch?v=QRQ8uVC7E7o&list=RDQRQ8uVC7E7o&start_radio=1
Hakan Peker-Karam;https://www.youtube.com/watch?v=tIgExFqyYMw&list=RDtIgExFqyYMw&start_radio=1
Athena-Senden Benden Bizden;https://www.youtube.com/watch?v=vRgMG_nicjQ&list=RDvRgMG_nicjQ&start_radio=1
Mustafa Sandal-Araba;https://www.youtube.com/watch?v=URebjWhKzBU&list=RDURebjWhKzBU&start_radio=1
MFÖ-Ali Desidero;https://www.youtube.com/watch?v=w_EVxBKM92g&list=RDw_EVxBKM92g&start_radio=1
MFÖ-Ele Güne Karşı;https://www.youtube.com/watch?v=dQcfBeNs5zE&list=RDdQcfBeNs5zE&start_radio=1
Sertab Erener-Güle Güle Şekerim;https://www.youtube.com/watch?v=cx1BZTBh4RM&list=RDcx1BZTBh4RM&start_radio=1
Levent Yüksel- Zalim;https://www.youtube.com/watch?v=Qj2Lq8k6LxI&list=RDQj2Lq8k6LxI&start_radio=1
Nirvana-Smells Like Teen Spirit;https://www.youtube.com/watch?v=lMdvpJpaolE&list=RDlMdvpJpaolE&start_radio=1
Barış Manço-Gibi gibi;https://www.youtube.com/watch?v=_aRtZSQNTqo&list=RD_aRtZSQNTqo&start_radio=1
Barış Manço-Can bedenden çıkmayınca;https://www.youtube.com/watch?v=3WAtON5odlQ&list=RD3WAtON5odlQ&start_radio=1
Barış Manço-Bal Böceği;https://www.youtube.com/watch?v=ofVxLHe6ki4&list=RDofVxLHe6ki4&start_radio=1
Duman-Köprüaltı;https://www.youtube.com/watch?v=7-6C8kVHd-g&list=RD7-6C8kVHd-g&start_radio=1
Yaşar-Divane;https://www.youtube.com/watch?v=n_wF-KqriE8&list=RDn_wF-KqriE8&start_radio=1
Dido- Thank you;https://www.youtube.com/watch?v=vg79oI8qrmg&list=RDvg79oI8qrmg&start_radio=1
Cem Karaca-Resimdeki gözyaşları;https://www.youtube.com/watch?v=l7n7vraGJZ0&list=RDl7n7vraGJZ0&start_radio=1
Sting-Shape of my Heart;https://www.youtube.com/watch?v=I-0VumW0XkE&list=RDI-0VumW0XkE&start_radio=1
Ricky Martin-Livin' la vida loca;https://www.youtube.com/watch?v=tOAs-c5jiuQ&list=RDtOAs-c5jiuQ&start_radio=1
Celine Dion-All by myself;https://www.youtube.com/watch?v=eiTOcxAmyLA&list=RDeiTOcxAmyLA&start_radio=1
Metallica-Nothing else matters;https://www.youtube.com/watch?v=LcK5u0usw6Y&list=RDLcK5u0usw6Y&start_radio=1
Spice Girls- Wannabe;https://www.youtube.com/watch?v=BTDPZQGqjY8&list=RDBTDPZQGqjY8&start_radio=1
No Doubt-Don't speak;https://www.youtube.com/watch?v=JtiocB8PYPs&list=RDJtiocB8PYPs&start_radio=1
Duman-Her Şeyi Yak;https://youtu.be/zWn7HoueR-U?si=PKe9_jH0Xj56QAnk
Scorpions-Still loving you;https://youtu.be/41wclfz5maI?si=zabTwk99b_7L9F8N
Scorpions-Wind of change;https://youtu.be/AAPRtwEp82c?si=_8ePDddxuY9mK2sm
Destiny's Child- Bills,bills,bills;https://youtu.be/nVhX4pt1rcs?si=Qvp-9rGCkk-WMuxv
Goo Goo Dolls-Iris;https://www.youtube.com/watch?v=OqtWMNZS-M0
Ayna-Yeniden de Sevebiliriz Akdeniz;https://www.youtube.com/watch?v=h-STdtHTXgM
Barış Manço-Alla beni pulla beni;https://youtu.be/h20Vt7qR_68?si=u7KCiq_XkObiEwc9
Yonca Evcimik-Abone;https://youtu.be/DPyxh_VJi8o?si=HXbHXnCMsnf-7HOi
Michael Jackson-They Don't Care About Us;https://www.youtube.com/watch?v=nG8FZ9yRev8&list=RDnG8FZ9yRev8&start_radio=1
Rusted Root-Send Me On My Way;https://www.youtube.com/watch?v=fEpfsVDPImI&list=RDfEpfsVDPImI&start_radio=1
Rengin-Aldatıldık;https://www.youtube.com/watch?v=mpam4HHjPGU&list=RDmpam4HHjPGU&start_radio=1
Mustafa Sandal - Jest Oldu;https://www.youtube.com/watch?v=50J5jzWXJ4k&list=RD50J5jzWXJ4k&start_radio=1
TARKAN - Kuzu Kuzu;https://www.youtube.com/watch?v=pgx5w9JA4og&list=RDpgx5w9JA4og&start_radio=1
Yeni Türkü- Aşk Yeniden;https://www.youtube.com/watch?v=FcCR6rclFhQ&list=RDFcCR6rclFhQ&start_radio=1
Kenan Doğulu- Tutamıyorum Zamanı;https://www.youtube.com/watch?v=6mDd9eobWMs&list=RD6mDd9eobWMs&start_radio=1
Gülşen - Ne Kavgam Bitti Ne Sevdam;https://www.youtube.com/watch?v=mxswOcVZtuw&list=RDmxswOcVZtuw&start_radio=1
Levent Yüksel- Medcezir;https://www.youtube.com/watch?v=bd0zPXNhBFg&list=RDbd0zPXNhBFg&start_radio=1
Harun Kolçak- Gir Kanıma;https://www.youtube.com/watch?v=G41rhu-wIfg&list=RDG41rhu-wIfg&start_radio=1
Demet Sağıroğlu - Arnavut Kaldırımı;https://www.youtube.com/watch?v=bJYbdZ6isUs&list=RDbJYbdZ6isUs&start_radio=1
Hakan Peker - Ateşini Yolla Bana;https://www.youtube.com/watch?v=jfj2IoC6Rks&list=RDjfj2IoC6Rks&start_radio=1
Serdar Ortaç - Karabiberim;https://www.youtube.com/watch?v=-_aF_HO2O-o&list=RD-_aF_HO2O-o&start_radio=1
Serdar Ortaç - Ben Adam Olmam;https://www.youtube.com/watch?v=aZDuOpabeng&list=RDaZDuOpabeng&start_radio=1
Burak Kut - Benimle Oynama;https://www.youtube.com/watch?v=6eFytaWQOVI&list=RD6eFytaWQOVI&start_radio=1
Destan-Cilveloy;https://www.youtube.com/watch?v=JMDvSCZ9pBc&list=RDJMDvSCZ9pBc&start_radio=1
Yaşar-Birtanem;https://www.youtube.com/watch?v=cOjyVsrWNFI&list=RDcOjyVsrWNFI&start_radio=1
Mirkelam-Her gece;https://www.youtube.com/watch?v=ZxNLeYymtUc&list=RDZxNLeYymtUc&start_radio=1
Harun Kolçak-Vermem Seni;https://www.youtube.com/watch?v=v2yBoX4eF7k&list=RDv2yBoX4eF7k&start_radio=1
Candan Erçetin-sevdim sevilmedim;https://www.youtube.com/watch?v=r5iE1ato0fk&list=RDr5iE1ato0fk&start_radio=1
Serdar Ortaç - Gamzelim;https://www.youtube.com/watch?v=15-jhCeLBj8&list=RD15-jhCeLBj8&start_radio=1
Ayşegül Aldinç-Allimallah;https://www.youtube.com/watch?v=Q2YlgVRqC-U&list=RDQ2YlgVRqC-U&start_radio=1`
);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [isDBActionRunning, setIsDBActionRunning] = useState(false);


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
  
  const handleBulkAdd = async (useDefaultList = false) => {
    if (!firestore || !user) return;
    setIsDBActionRunning(true);
    
    const textToProcess = useDefaultList ? bulkText : (document.getElementById('bulk-textarea') as HTMLTextAreaElement)?.value || '';

    if (!textToProcess.trim()) {
        toast({
            variant: "destructive",
            title: "Liste Boş",
            description: "Eklenecek şarkı bulunamadı.",
        });
        setIsDBActionRunning(false);
        return;
    }

    const lines = textToProcess.trim().split('\n');
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
                    studentId: user.uid,
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
        if (!useDefaultList) {
          setBulkText("");
        }
    } catch (error) {
        console.error("Bulk add failed:", error);
        toast({
            variant: "destructive",
            title: "Toplu Ekleme Başarısız",
            description: "Şarkılar eklenirken bir hata oluştu.",
        });
    } finally {
        setIsDBActionRunning(false);
        setShowAddConfirm(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!firestore) return;
    setIsDBActionRunning(true);
    const querySnapshot = await getDocs(collection(firestore, "song_requests"));
    const batch = writeBatch(firestore);
    querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
    });

    try {
        await batch.commit();
        toast({
            title: "Liste Temizlendi",
            description: "Tüm şarkılar başarıyla silindi.",
        });
    } catch (error) {
        console.error("Delete all failed:", error);
        toast({
            variant: "destructive",
            title: "Silme Başarısız",
            description: "Şarkılar silinirken bir hata oluştu.",
        });
    } finally {
        setIsDBActionRunning(false);
        setShowDeleteConfirm(false);
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
                {role === 'owner' && (
                <section className="mt-12 border-t-2 border-red-500/30 pt-6">
                    <h2 className="text-xl font-bold mb-3 text-red-400 flex items-center gap-2">
                        <AlertTriangle /> Tehlikeli Alan
                    </h2>
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <h3 className="font-bold text-white">Veritabanı Operasyonları</h3>
                            <p className="text-sm text-red-300/80 mt-1">
                                Bu işlemler geri alınamaz. Mevcut listeyi silmek veya varsayılan listeyi yeniden yüklemek için kullanın.
                            </p>
                        </div>
                        <div className="flex gap-2 items-center">
                            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} disabled={isDBActionRunning}>
                                Tüm Listeyi Sil
                            </Button>
                            <Button variant="secondary" onClick={() => setShowAddConfirm(true)} disabled={isDBActionRunning}>
                                Varsayılan Listeyi Ekle
                            </Button>
                        </div>
                    </div>
                </section>
                )}
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
                        id="bulk-textarea"
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        placeholder="Kuzu Kuzu;https://youtube.com/..."
                        className="retro-input-soft min-h-[200px]"
                        rows={10}
                    />
                    <div className="flex justify-end">
                        <Button onClick={() => handleBulkAdd(false)} disabled={isDBActionRunning}>
                            {isDBActionRunning ? "Ekleniyor..." : "Metin Alanındaki Listeyi Ekle"}
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

      {/* Single Delete Dialog */}
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

       {/* Delete All Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Tüm Şarkıları Silmek Üzeresiniz!</AlertDialogTitle>
                  <AlertDialogDescription>
                      Bu işlem geri alınamaz. Veritabanındaki tüm şarkı istekleri kalıcı olarak silinecektir. Emin misiniz?
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAll} disabled={isDBActionRunning} className="bg-red-600 hover:bg-red-700">
                      {isDBActionRunning ? "Siliniyor..." : "Evet, Tümünü Sil"}
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      {/* Add Default List Confirmation Dialog */}
      <AlertDialog open={showAddConfirm} onOpenChange={setShowAddConfirm}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Varsayılan Listeyi Ekle?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Bu işlem, "Toplu Ekle" sekmesindeki varsayılan listeyi veritabanına ekleyecektir. Bu, mevcut şarkıların üzerine yazmaz, sadece ekleme yapar.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleBulkAdd(true)} disabled={isDBActionRunning}>
                      {isDBActionRunning ? "Ekleniyor..." : "Evet, Ekle"}
                  </AlertDialogAction>
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
  const { firestore } = useFirebase(); // user'ı buradan kaldırıyoruz
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Basit parola kontrolüne geri dön
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

  // Basit render mantığı
  if (!role) {
    return <LoginForm onLogin={handleLogin} error={error} />;
  }
  
  // `user` prop'unu AdminPanel'e geçerken geçici bir değer kullanıyoruz,
  // çünkü artık firebase auth kullanmıyoruz ama AdminPanel bekliyor.
  // Bu daha sonra temizlenebilir.
  const fakeUser = { uid: role === 'owner' ? 'owner_user' : 'admin_user' };

  return <AdminPanel role={role} />;
}

    