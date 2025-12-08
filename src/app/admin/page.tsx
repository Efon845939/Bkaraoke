
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
import md5 from "crypto-js/md5";


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
`REM-Losing My Religion;https://www.youtube.com/watch?v=Efa6BAWPm9o
Bulutsuzluk Özlemi-Sözlerimi Geri Alamam;https://www.youtube.com/watch?v=RMu2HUTGe2c
Şebnem Ferah-Sil Baştan;https://www.youtube.com/watch?v=yjGigzkkXMM
Gülşen-Be Adam;https://www.youtube.com/watch?v=liaMcRqwOKs
Tarkan-Hepsi Senin Mi?;https://www.youtube.com/watch?v=GB5J_2jWxMQ
Kenan Doğulu -Yaparım Bilirsin (Hızlı Ebru Gündeş versiyon);https://www.youtube.com/watch?v=7JJH5GZPJNw
Hakan Peker-Karam;https://www.youtube.com/watch?v=xQBIAUU4NVk
Athena-Senden Benden Bizden;https://www.youtube.com/watch?v=ODzwocw9z28
Mustafa Sandal-Araba;https://www.youtube.com/watch?v=-lcfABgHKfs
MFÖ-Ali Desidero;https://www.youtube.com/watch?v=inwiXmzKun8
MFÖ-Ele Güne Karşı;https://www.youtube.com/watch?v=4DZbURvoDEc
Sertab Erener-Güle Güle Şekerim;https://www.youtube.com/watch?v=rAAfQOLMZmo
Levent Yüksel- Zalim;https://www.youtube.com/watch?v=R0KCc9-0i6E
Nirvana-Smells Like Teen Spirit;https://www.youtube.com/watch?v=Q6SHkQMFVlc
Barış Manço-Gibi gibi;https://youtu.be/vqFb0kCvE5o?si=gCQR2wk_Qlh-mB5R
Barış Manço-Can Bedenden Çıkmayınca;https://youtu.be/RTpyeclPZuU?si=7cOshfxvkl3OEy5F
Barış Manço-Bal Böceği;https://youtu.be/YXmSNwYIw7Q?si=kLyrMl6DlwUpiMpP
Duman-Köprüaltı;https://www.youtube.com/watch?v=2J75v4Y9h7k
Yaşar-Divane;https://www.youtube.com/watch?v=WiFFLGyT59I
Dido-Thank You;https://m.youtube.com/watch?v=1TO48Cnl66w
Cem Karaca-Resimdeki Gözyaşları;https://www.youtube.com/watch?v=LfnX9nujOQ0
Sting-Shape of My Heart;https://youtu.be/NlwIDxCjL-8?si=VI-T85Dnw0HwCS5A
Ricky Martin-Livin' La Vida Loca;https://www.youtube.com/watch?v=CN5hQOI__10
Celine Dion-All By Myself;https://www.youtube.com/watch?v=NGrLb6W5YOM
Metallica-Nothing Else Matters;https://www.youtube.com/watch?v=ozXZnwYTMbs
Spice Girls-Wannabe;https://www.youtube.com/watch?v=gJLIiF15wjQ&list=RDgJLIiF15wjQ&start_radio=1
No Doubt-Don't Speak;https://www.youtube.com/watch?v=1leInEAlbjY
Duman-Her Şeyi Yak;https://www.youtube.com/watch?v=pc5SQI85Y-M
Scorpions-Still Loving You;https://www.youtube.com/watch?v=O5Kw41JAfG4
Scorpions-Wind of Change;https://www.youtube.com/watch?v=F_-ZuVy76yg
Destiny's Child-Bills,Bills,Bills;https://www.youtube.com/watch?v=NiF6-0UTqtc
Goo Goo Dolls-Iris;https://www.youtube.com/watch?v=xK4ZqrLys_k
Ayna-Yeniden de Sevebiliriz Akdeniz;https://www.youtube.com/watch?v=eKANhic0mFc
Barış Manço-Alla Beni Pulla Beni;https://www.youtube.com/watch?v=GUKIEjmQ1Bc
Yonca Evcimik-Abone;https://www.youtube.com/watch?v=dO_FYA_YcS4&list=RDdO_FYA_YcS4&start_radio=1
Michael Jackson-They Don't Care About Us;https://www.youtube.com/watch?v=GsHZBisKwxg
Rusted Root-Send Me On My Way;https://www.youtube.com/watch?v=rwHv2XlIC_w
Rengin-Aldatıldık;https://www.youtube.com/watch?v=cbLp3GNjfd0&list=RDcbLp3GNjfd0&start_radio=1
Mustafa Sandal-Jest Oldu;https://www.youtube.com/watch?v=GEQBBJ4Es2Y&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=1
TARKAN - Kuzu Kuzu;https://www.youtube.com/watch?v=NAHRpEqgcL4&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=2
Yeni Türkü- Aşk Yeniden;https://www.youtube.com/watch?v=_NdZIknMk1w&list=RD_NdZIknMk1w&start_radio=1
Kenan Doğulu- Tutamıyorum Zamanı;https://www.youtube.com/watch?v=xGzDUYPr0GQ&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=4
Gülşen - Ne Kavgam Bitti Ne Sevdam;https://www.youtube.com/watch?v=_kBMsB32Fg8&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=5
Levent Yüksel- Medcezir;https://www.youtube.com/watch?v=QJ_HX8t9YXI&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=13
Harun Kolçak- Gir Kanıma;https://www.youtube.com/watch?v=hK73i75SnQw&list=RDhK73i75SnQw&start_radio=1
Demet Sağıroğlu - Arnavut Kaldırımı;https://www.youtube.com/watch?v=bdso4qwyul0&list=PLxyIA5E2lVC6Rv_7xZ881HselvQh80WHG
Hakan Peker - Ateşini Yolla Bana;https://www.youtube.com/watch?v=3uZL9NEOiro&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=25
Serdar Ortaç - Karabiberim;https://www.youtube.com/watch?v=Cg16C85FyEQ&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=26
Serdar Ortaç - Ben Adam Olmam;https://www.youtube.com/watch?v=IxBEG2JRm3I&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=27
Burak Kut - Benimle Oynama;https://www.youtube.com/watch?v=vgqHhAwlYmg&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=33
Destan-Cilveloy;https://www.youtube.com/watch?v=btn09hwF3pc&list=RDbtn09hwF3pc&start_radio=1
Yaşar-Birtanem;https://www.youtube.com/watch?v=MRsF_H_6w48&list=RDMRsF_H_6w48&start_radio=1
Mirkelam-Her Gece;https://www.youtube.com/watch?v=7w9IDP_OR9M&list=RD7w9IDP_OR9M&start_radio=1
Harun Kolçak-Vermem Seni;https://www.youtube.com/watch?v=9qsxPw2OlDA&list=RD9qsxPw2OlDA&start_radio=1
Candan Erçetin-Sevdim Sevilmedim;https://www.youtube.com/watch?v=mtLwmoYxD34&list=RDmtLwmoYxD34&start_radio=1
Serdar Ortaç - Gamzelim;https://www.youtube.com/watch?v=UGhQ90SHECQ&list=RDUGhQ90SHECQ&start_radio=1
Ayşegül Aldinç-Allimallah;https://www.youtube.com/watch?v=Q2YlgVRqC-U&list=RDQ2YlgVRqC-U&start_radio=1
Reyhan Karaca - Sevdik Sevdalandık;https://www.youtube.com/watch?v=6ahjwoNB01c&list=RD6ahjwoNB01c&start_radio=1
Kenan Doğulu-Ben Güzelden Anlarım;https://www.youtube.com/watch?v=BBZneZ36xzQ&list=RDBBZneZ36xzQ&start_radio=1
Bendeniz - Gönül Yareler İçinde;https://www.youtube.com/watch?v=h1d_1xTot30&list=RDh1d_1xTot30&start_radio=1
Ajda Pekkan-Bambaşka Biri;https://www.youtube.com/watch?v=FrjWcu1c0-4&list=RDFrjWcu1c0-4&start_radio=1
Emel Müftüoğlu - Hovarda;https://www.youtube.com/watch?v=O1wyl6sbZyI&list=RDO1wyl6sbZyI&start_radio=1
Ajda Pekkan-Haykıracak Nefesim Kalmasa Bile;https://www.youtube.com/watch?v=G81e4utp3Mo&list=RDG81e4utp3Mo&start_radio=1
Yıldız Tilbe - Sana Değer;https://www.youtube.com/watch?v=_Qw1l1BbJwM&list=RD_Qw1l1BbJwM&start_radio=1
Ajda Pekkan-Palavra Palavra;https://www.youtube.com/watch?v=VgK7sFO4kaw&list=RDVgK7sFO4kaw&start_radio=1
Mirkelam - Tavla;https://www.youtube.com/watch?v=vE62W7vbKjs&list=RDvE62W7vbKjs&start_radio=1
Ajda Pekkan-Yaz Yaz Yaz;https://www.youtube.com/watch?v=93wsynxLMLk&list=RD93wsynxLMLk&start_radio=1
Seda Sayan-Ah Geceler;https://www.youtube.com/watch?v=DfpeVaTy82M&list=RDDfpeVaTy82M&start_radio=1
Tarkan - Ölürüm Sana;https://www.youtube.com/watch?v=LJ9FpMXJmwY&list=RDLJ9FpMXJmwY&start_radio=1
Ajda Pekkan-Eline,Gözüne,Dizine Dursun;https://www.youtube.com/watch?v=K87LGdaCh-c&list=RDK87LGdaCh-c&start_radio=1
Aşkın Nur Yengi-Ay İnanmıyorum;https://www.youtube.com/watch?v=zFM9Jq31UEY&list=RDzFM9Jq31UEY&start_radio=1
Sinan Erkoç - Havam Yerinde;https://www.youtube.com/watch?v=QhL3lXjtB5U&list=RDQhL3lXjtB5U&start_radio=1
Sertab Erener - Zor Kadın;https://www.youtube.com/watch?v=kQMWd7oyFlo&list=RDkQMWd7oyFlo&start_radio=1
Sezen Aksu - Seni Yerler;https://www.youtube.com/watch?v=IVE00F-2ZCw&list=RDIVE00F-2ZCw&start_radio=1
Ebru Gündeş-Fırtınalar;https://www.youtube.com/watch?v=a8-RshlYFGA&list=RDa8-RshlYFGA&start_radio=1
Mansur Ark - Maalesef;https://www.youtube.com/watch?v=dPNj8kJP31A&list=RDdPNj8kJP31A&start_radio=1
Mustafa Sandal - Aya Benzer;https://www.youtube.com/watch?v=VlEOPZNTeTc&list=RDVlEOPZNTeTc&start_radio=1
Sezen Aksu - Kaçın Kurası;https://www.youtube.com/watch?v=352QSI4nsQk&list=RD352QSI4nsQk&start_radio=1
Burak Kut - Yaşandı Bitti;https://www.youtube.com/watch?v=Fx4ccla8O7Y&list=RDFx4ccla8O7Y&start_radio=1
Nükhet Duru-Mahmure;https://www.youtube.com/watch?v=oNOUy-TYHoI&list=RDoNOUy-TYHoI&start_radio=1
Atilla Taş-Zennube;https://www.youtube.com/watch?v=Lhpj4SvgC_8&list=RDLhpj4SvgC_8&start_radio=1
Yonca Evcimik-Bandıra Bandıra;https://www.youtube.com/watch?v=y7uDYFxXwcg&list=RDy7uDYFxXwcg&start_radio=1
Çelik - Ateşteyim;https://www.youtube.com/watch?v=zPBxIp_kMpM&list=RDzPBxIp_kMpM&start_radio=1
Candan Erçetin-Umrumda Değil;https://www.youtube.com/watch?v=JBElQJbWdF0&list=RDJBElQJbWdF0&start_radio=1
Mustafa Sandal - Gidenlerden;https://www.youtube.com/watch?v=u3L6gByQnrI&list=RDu3L6gByQnrI&start_radio=1
Seyyal Taner - Alladı Pulladı;https://www.youtube.com/watch?v=titaJ2mXoCM&list=RDtitaJ2mXoCM&start_radio=1
Mustafa Sandal-Bu Kız Beni Görmeli;https://www.youtube.com/watch?v=9Fde8AckZzs&list=RD9Fde8AckZzs&start_radio=1
Sezen Aksu-Onu Alma Beni Al;https://www.youtube.com/watch?v=uAxlVEDv860&list=RDuAxlVEDv860&start_radio=1
Sezen Aksu- Hadi Bakalım;https://www.youtube.com/watch?v=HSVseiOjAPw&list=RDHSVseiOjAPw&start_radio=1
Tarkan-Kıl Oldum;https://www.youtube.com/watch?v=pB-gSNevlnk&list=RDpB-gSNevlnk&start_radio=1
Çelik- Hercai;https://www.youtube.com/watch?v=4tnyQ8lYH_k&list=RD4tnyQ8lYH_k&start_radio=1
İzel- Ah Yandım;https://www.youtube.com/watch?v=YHDacCdTLwE&list=RDYHDacCdTLwE&start_radio=1
Ege- Delice Bir Sevda;https://www.youtube.com/watch?v=-lycRoJk954&list=RD-lycRoJk954&start_radio=1
Burak Kut- Bebeğim;https://www.youtube.com/watch?v=XXnGLMWdr-4&list=RDXXnGLMWdr-4&start_radio=1
Sibel Alaş- Adam;https://www.youtube.com/watch?v=ThufvaUVi1Q&list=RDThufvaUVi1Q&start_radio=1
Oya- Bora- Sevmek Zamanı;https://www.youtube.com/watch?v=w7LqXb1Qm1U&list=RDw7LqXb1Qm1U&start_radio=1
Tarkan-Kış Güneşi;https://www.youtube.com/watch?v=-CxauCeQ_SQ&list=RD-CxauCeQ_SQ&start_radio=1
Doğuş- Uyan;https://www.youtube.com/watch?v=XxPPkc_M-YU&list=PLxyIA5E2lVC6Rv_7xZ881HselvQh80WHG&index=16
Rafet El Roman- Sorma Neden;https://www.youtube.com/watch?v=0VlfPTGpLCs&list=PLxyIA5E2lVC6Rv_7xZ881HselvQh80WHG&index=22
Ferda Anıl Yarkın- Sonuna Kadar;https://www.youtube.com/watch?v=slTJhCBXUpQ&list=PLxyIA5E2lVC6Rv_7xZ881HselvQh80WHG&index=25
Asya-Vurulmuşum Sana;https://www.youtube.com/watch?v=ZaPF2hPgDlc&list=RDZaPF2hPgDlc&start_radio=1
Asya-Beni Aldattın;https://www.youtube.com/watch?v=rRdZbb2_eYc&list=RDrRdZbb2_eYc&start_radio=1
Asya - Pişmanım;https://www.youtube.com/watch?v=oO8mBHaZBkA&list=RDoO8mBHaZBkA&start_radio=1
Nilüfer- Mavilim;https://www.youtube.com/watch?v=17we-e5wjc8&list=RD17we-e5wjc8&start_radio=1
Nilüfer- Haram Geceler;https://www.youtube.com/watch?v=Bco67TlT9p0&list=RDBco67TlT9p0&start_radio=1
Nilüfer- Gözlerinin Hapsindeyim;https://www.youtube.com/watch?v=JHF561IZwfo&list=RDJHF561IZwfo&start_radio=1
Nilüfer & Kayahan- Yemin Ettim;https://www.youtube.com/watch?v=PSCI5u3O7ZE&list=RDPSCI5u3O7ZE&start_radio=1
Nilüfer- Ve Melankoli;https://www.youtube.com/watch?v=itH2_T5yCAs&list=RDitH2_T5yCAs&start_radio=1
Nilüfer- Son Arzum;https://www.youtube.com/watch?v=gwtiHjOixDQ&list=RDgwtiHjOixDQ&start_radio=1
Nilüfer- Başıma Gelenler;https://www.youtube.com/watch?v=M_2ufwpZNI0&list=RDM_2ufwpZNI0&start_radio=1
Aşkın Nur Yengi - Yalancı Bahar;https://www.youtube.com/watch?v=kGkezfjlDlQ&list=RDkGkezfjlDlQ&start_radio=1`
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
                        placeholder="Şebnem Ferah-Sil Baştan;https://youtube.com/..."
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

// Düz şifrelerin MD5 hash'leri
const OWNER_HASH = "5e9d51bd8397efaa719e3bd5d8e8410d";   // gizli_kara90ke
const ADMIN_HASH = "b4470385ae6f3aa166295d0920df17d3";   // kara90ke

const handleLogin = (password: string) => {
  const hashed = md5(password).toString();

  if (hashed === OWNER_HASH) {
    setRole("owner");
    setError(null);
  } else if (hashed === ADMIN_HASH) {
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

    