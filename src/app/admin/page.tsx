"use client";

import { useMemo, useState } from "react";
import {
  useCollection,
  useFirebase,
  useMemoFirebase,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from "@/firebase";

import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
  getDocs,
} from "firebase/firestore";

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
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import md5 from "crypto-js/md5";

import { useOwnerSongRequestToast } from "@/lib/owner-toast-notify";

const isProbablyUrl = (s: string) => {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
};

/**
 * Bulk parser accepts:
 * 1) "Title;KaraokeUrl"
 * 2) "Title<TAB>SongUrl<TAB>KaraokeUrl"
 * 3) 3-line blocks: Title \n SongUrl \n KaraokeUrl
 */
function parseBulkInput(
  raw: string
): Array<{ songTitle: string; songLink?: string; karaokeLink: string }> {
  const text = (raw || "").replace(/\r/g, "\n");

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // TAB format (Excel export)
  const tabRows = lines.filter((l) => l.includes("\t"));
  if (tabRows.length >= Math.max(3, Math.floor(lines.length * 0.3))) {
    const out: Array<{ songTitle: string; songLink?: string; karaokeLink: string }> =
      [];
    for (const row of lines) {
      if (!row.includes("\t")) continue;
      const cols = row.split("\t").map((c) => c.trim());
      const songTitle = (cols[0] || "").trim();
      const songLink = cols[1] && isProbablyUrl(cols[1]) ? cols[1] : undefined;
      const karaokeLink = cols[2] && isProbablyUrl(cols[2]) ? cols[2] : "";
      if (!songTitle || !karaokeLink) continue;
      out.push({ songTitle, songLink, karaokeLink });
    }
    return out;
  }

  // 3-line blocks
  const urlLikeCount = lines.filter((l) => isProbablyUrl(l)).length;
  if (urlLikeCount >= Math.max(6, Math.floor(lines.length * 0.4))) {
    const out: Array<{ songTitle: string; songLink?: string; karaokeLink: string }> =
      [];
    for (let i = 0; i < lines.length; ) {
      const title = lines[i] || "";
      const a = lines[i + 1] || "";
      const b = lines[i + 2] || "";
      if (title && isProbablyUrl(a) && isProbablyUrl(b)) {
        out.push({ songTitle: title, songLink: a, karaokeLink: b });
        i += 3;
        continue;
      }
      i += 1;
    }
    if (out.length) return out;
  }

  // Semicolon per line: Title;KaraokeUrl
  const out: Array<{ songTitle: string; songLink?: string; karaokeLink: string }> =
    [];
  for (const line of lines) {
    const parts = line
      .split(";")
      .map((x) => x.trim())
      .filter(Boolean);
    if (parts.length < 2) continue;
    const songTitle = parts[0];
    const karaokeLink = parts[1];
    if (!songTitle || !karaokeLink) continue;
    if (!isProbablyUrl(karaokeLink)) continue;
    out.push({ songTitle, karaokeLink });
  }
  return out;
}

type Role = "admin" | "owner";

type Song = {
  id: string;
  studentName: string;
  songTitle: string;
  songLink?: string;
  karaokeLink: string;
  status: "pending" | "approved" | "rejected";
  createdAt: any;
  studentId?: string;
};

type AuditLog = {
  id: string;
  action: string;
  songTitle: string;
  performedBy: Role;
  timestamp: any;
};

function LoginForm({
  onLogin,
  error,
}: {
  onLogin: (pw: string) => void;
  error: string | null;
}) {
  const [pw, setPw] = useState("");
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-neutral-200">
      <div className="w-full max-w-sm p-6 rounded-xl border border-neutral-800 bg-neutral-950/70">
        <h1 className="text-2xl font-bold mb-2">Admin Panel</h1>
        <p className="text-sm text-neutral-400 mb-4">
          Şifre gir, sonra dünyayı yönet.
        </p>
        <Input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Şifre"
          className="retro-input-soft"
        />
        {error && (
          <p className="text-sm text-red-400 mt-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </p>
        )}
        <Button className="w-full mt-4" onClick={() => onLogin(pw)}>
          Giriş
        </Button>
        <div className="mt-4 text-xs text-neutral-500">
          <Link href="/" className="hover:underline">
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    </div>
  );
}

function SongRow({
  s,
  role,
  onEdit,
  onDelete,
  onSetStatus,
}: {
  s: Song;
  role: Role;
  onEdit: () => void;
  onDelete: () => void;
  onSetStatus: (song: Song, status: "approved" | "rejected" | "pending") => void;
}) {
  const when = s.createdAt?.toDate
    ? formatDistanceToNow(s.createdAt.toDate(), { addSuffix: true, locale: tr })
    : "—";

  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-lg border border-neutral-800 bg-neutral-950/50">
      <div className="min-w-0">
        <div className="text-sm text-neutral-400">{when}</div>
        <div>
          <strong>{s.studentName}</strong> — {s.songTitle}
        </div>

        {s.songLink && (
          <a
            href={s.songLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-sky-300 hover:underline"
          >
            {s.songLink}
          </a>
        )}

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
              className="px-2 py-1 text-xs rounded bg-emerald-900/40 border border-emerald-700 text-emerald-200 hover:bg-emerald-900/60"
            >
              Onayla
            </button>
            <button
              onClick={() => onSetStatus(s, "rejected")}
              className="px-2 py-1 text-xs rounded bg-red-900/40 border border-red-700 text-red-200 hover:bg-red-900/60"
            >
              Reddet
            </button>

            <Button
              onClick={onEdit}
              size="icon"
              variant="ghost"
              className="h-8 w-8"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              onClick={onDelete}
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-red-400 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="text-xs text-neutral-500">Admin</div>
        )}
      </div>
    </div>
  );
}

const AdminPanel = ({ role }: { role: Role }) => {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [deletingSong, setDeletingSong] = useState<Song | null>(null);

  // Buraya kendi uzun listenizi koyabilirsiniz ama mutlaka düzgün ` ile bitsin.
  const [bulkText, setBulkText] = useState(
    `REM-Losing My Religion	https://www.youtube.com/watch?v=Efa6BAWPm9o	https://www.youtube.com/watch?v=gCrqBZlxSyA
Bulutsuzluk Özlemi-Sözlerimi Geri Alamam	https://www.youtube.com/watch?v=RMu2HUTGe2c	https://www.youtube.com/watch?v=jHULD4aZnS0
Şebnem Ferah-Sil Baştan	https://www.youtube.com/watch?v=yjGigzkkXMM	https://www.youtube.com/watch?v=MGKQpfWrBx0&list=RDMGKQpfWrBx0&start_radio=1
Gülşen-Be Adam	https://www.youtube.com/watch?v=liaMcRqwOKs	https://www.youtube.com/watch?v=AyXlebMMAWE&list=RDAyXlebMMAWE&start_radio=1
Tarkan-Hepsi Senin Mi?	https://www.youtube.com/watch?v=GB5J_2jWxMQ	https://www.youtube.com/watch?v=20azTn_qfuE&list=RD20azTn_qfuE&start_radio=1
Kenan Doğulu -Yaparım Bilirsin(Hızlı Ebru Gündeş versiyon)	https://www.youtube.com/watch?v=7JJH5GZPJNw	https://www.youtube.com/watch?v=QRQ8uVC7E7o&list=RDQRQ8uVC7E7o&start_radio=1
Hakan Peker-Karam	https://www.youtube.com/watch?v=xQBIAUU4NVk	https://www.youtube.com/watch?v=tIgExFqyYMw&list=RDtIgExFqyYMw&start_radio=1
Athena-Senden Benden Bizden	https://www.youtube.com/watch?v=ODzwocw9z28	https://www.youtube.com/watch?v=vRgMG_nicjQ&list=RDvRgMG_nicjQ&start_radio=1
Mustafa Sandal-Araba	https://www.youtube.com/watch?v=-lcfABgHKfs	https://www.youtube.com/watch?v=URebjWhKzBU&list=RDURebjWhKzBU&start_radio=1
MFÖ-Ali Desidero	https://www.youtube.com/watch?v=inwiXmzKun8	https://www.youtube.com/watch?v=w_EVxBKM92g&list=RDw_EVxBKM92g&start_radio=1
MFÖ-Ele Güne Karşı	https://www.youtube.com/watch?v=4DZbURvoDEc&list=RD4DZbURvoDEc&start_radio=1	https://www.youtube.com/watch?v=dQcfBeNs5zE&list=RDdQcfBeNs5zE&start_radio=1
Sertab Erener-Güle Güle Şekerim	https://www.youtube.com/watch?v=rAAfQOLMZmo	https://www.youtube.com/watch?v=cx1BZTBh4RM&list=RDcx1BZTBh4RM&start_radio=1
Levent Yüksel- Zalim	https://www.youtube.com/watch?v=R0KCc9-0i6E	https://www.youtube.com/watch?v=Qj2Lq8k6LxI&list=RDQj2Lq8k6LxI&start_radio=1
Nirvana-Smells Like Teen Spirit	https://www.youtube.com/watch?v=Q6SHkQMFVlc	https://www.youtube.com/watch?v=lMdvpJpaolE&list=RDlMdvpJpaolE&start_radio=1
Barış Manço-Gibi gibi	https://youtu.be/vqFb0kCvE5o?si=gCQR2wk_Qlh-mB5R	https://www.youtube.com/watch?v=_aRtZSQNTqo&list=RD_aRtZSQNTqo&start_radio=1
Barış Manço-Can Bedenden Çıkmayınca	https://youtu.be/RTpyeclPZuU?si=7cOshfxvkl3OEy5F	https://www.youtube.com/watch?v=3WAtON5odlQ&list=RD3WAtON5odlQ&start_radio=1
Barış Manço-Bal Böceği	https://youtu.be/YXmSNwYIw7Q?si=kLyrMl6DlwUpiMpP	https://www.youtube.com/watch?v=ofVxLHe6ki4&list=RDofVxLHe6ki4&start_radio=1
Duman-Köprüaltı	https://www.youtube.com/watch?v=2J75v4Y9h7k	https://www.youtube.com/watch?v=7-6C8kVHd-g&list=RD7-6C8kVHd-g&start_radio=1
Yaşar-Divane	https://www.youtube.com/watch?v=WiFFLGyT59I	https://www.youtube.com/watch?v=n_wF-KqriE8&list=RDn_wF-KqriE8&start_radio=1
Dido- Thank You	https://m.youtube.com/watch?v=1TO48Cnl66w&pp=ygUJVGhhbmsgeW91	https://www.youtube.com/watch?v=vg79oI8qrmg&list=RDvg79oI8qrmg&start_radio=1
Cem Karaca-Resimdeki Gözyaşları	https://www.youtube.com/watch?v=LfnX9nujOQ0	https://www.youtube.com/watch?v=l7n7vraGJZ0&list=RDl7n7vraGJZ0&start_radio=1
Sting-Shape of My Heart	https://youtu.be/NlwIDxCjL-8?si=VI-T85Dnw0HwCS5A	https://www.youtube.com/watch?v=I-0VumW0XkE&list=RDI-0VumW0XkE&start_radio=1
Ricky Martin-Livin' La Vida Loca	https://www.youtube.com/watch?v=CN5hQOI__10	https://www.youtube.com/watch?v=tOAs-c5jiuQ&list=RDtOAs-c5jiuQ&start_radio=1
Celine Dion-All By Myself	https://www.youtube.com/watch?v=NGrLb6W5YOM	https://www.youtube.com/watch?v=eiTOcxAmyLA&list=RDeiTOcxAmyLA&start_radio=1
Metallica-Nothing Else Matters	https://www.youtube.com/watch?v=ozXZnwYTMbs	https://www.youtube.com/watch?v=LcK5u0usw6Y&list=RDLcK5u0usw6Y&start_radio=1
Spice Girls- Wannabe	https://www.youtube.com/watch?v=gJLIiF15wjQ&list=RDgJLIiF15wjQ&start_radio=1	https://www.youtube.com/watch?v=BTDPZQGqjY8&list=RDBTDPZQGqjY8&start_radio=1
No Doubt - Don't Speak	https://www.youtube.com/watch?v=1leInEAlbjY	https://www.youtube.com/watch?v=JtiocB8PYPs&list=RDJtiocB8PYPs&start_radio=1
Duman-Her Şeyi Yak	https://www.youtube.com/watch?v=pc5SQI85Y-M	https://youtu.be/zWn7HoueR-U?si=PKe9_jH0Xj56QAnk
Scorpions-Still Loving You	https://www.youtube.com/watch?v=O5Kw41JAfG4	https://youtu.be/41wclfz5maI?si=zabTwk99b_7L9F8N
Scorpions-Wind of Change	https://www.youtube.com/watch?v=F_-ZuVy76yg	https://youtu.be/AAPRtwEp82c?si=_8ePDddxuY9mK2sm
Destiny's Child- Bills,Bills,Bills	https://www.youtube.com/watch?v=NiF6-0UTqtc	https://youtu.be/nVhX4pt1rcs?si=Qvp-9rGCkk-WMuxv
Goo Goo Dolls-Iris	https://www.youtube.com/watch?v=xK4ZqrLys_k	https://www.youtube.com/watch?v=OqtWMNZS-M0
Ayna-Yeniden de Sevebiliriz Akdeniz	https://www.youtube.com/watch?v=eKANhic0mFc	https://www.youtube.com/watch?v=h-STdtHTXgM
Barış Manço-Alla Beni Pulla Beni	https://www.youtube.com/watch?v=GUKIEjmQ1Bc	https://youtu.be/h20Vt7qR_68?si=u7KCiq_XkObiEwc9
Yonca Evcimik-Abone	https://www.youtube.com/watch?v=dO_FYA_YcS4&list=RDdO_FYA_YcS4&start_radio=1	https://youtu.be/DPyxh_VJi8o?si=HXbHXnCMsnf-7HOi
Michael Jackson-They Don't Care About Us	https://www.youtube.com/watch?v=GsHZBisKwxg	https://www.youtube.com/watch?v=nG8FZ9yRev8&list=RDnG8FZ9yRev8&start_radio=1
Rusted Root-Send Me On My Way	https://www.youtube.com/watch?v=rwHv2XlIC_w	https://www.youtube.com/watch?v=fEpfsVDPImI&list=RDfEpfsVDPImI&start_radio=1
Rengin-Aldatıldık	https://www.youtube.com/watch?v=cbLp3GNjfd0&list=RDcbLp3GNjfd0&start_radio=1	https://www.youtube.com/watch?v=mpam4HHjPGU&list=RDmpam4HHjPGU&start_radio=1
Mustafa Sandal - Jest Oldu	https://www.youtube.com/watch?v=GEQBBJ4Es2Y&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=1	https://www.youtube.com/watch?v=50J5jzWXJ4k&list=RD50J5jzWXJ4k&start_radio=1
TARKAN - Kuzu Kuzu	https://www.youtube.com/watch?v=NAHRpEqgcL4&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=2	https://www.youtube.com/watch?v=pgx5w9JA4og&list=RDpgx5w9JA4og&start_radio=1
Yeni Türkü- Aşk Yeniden	https://www.youtube.com/watch?v=_NdZIknMk1w&list=RD_NdZIknMk1w&start_radio=1	https://www.youtube.com/watch?v=FcCR6rclFhQ&list=RDFcCR6rclFhQ&start_radio=1
Kenan Doğulu- Tutamıyorum Zamanı	https://www.youtube.com/watch?v=xGzDUYPr0GQ&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=4	https://www.youtube.com/watch?v=6mDd9eobWMs&list=RD6mDd9eobWMs&start_radio=1
Gülşen - Ne Kavgam Bitti Ne Sevdam	https://www.youtube.com/watch?v=_kBMsB32Fg8&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=5	https://www.youtube.com/watch?v=mxswOcVZtuw&list=RDmxswOcVZtuw&start_radio=1
Levent Yüksel- Medcezir	https://www.youtube.com/watch?v=QJ_HX8t9YXI&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=13	https://www.youtube.com/watch?v=bd0zPXNhBFg&list=RDbd0zPXNhBFg&start_radio=1
Harun Kolçak- Gir Kanıma	https://www.youtube.com/watch?v=hK73i75SnQw&list=RDhK73i75SnQw&start_radio=1	https://www.youtube.com/watch?v=G41rhu-wIfg&list=RDG41rhu-wIfg&start_radio=1
Demet Sağıroğlu - Arnavut Kaldırımı	https://www.youtube.com/watch?v=bdso4qwyul0&list=PLxyIA5E2lVC6Rv_7xZ881HselvQh80WHG	https://www.youtube.com/watch?v=bJYbdZ6isUs&list=RDbJYbdZ6isUs&start_radio=1
Hakan Peker - Ateşini Yolla Bana	https://www.youtube.com/watch?v=3uZL9NEOiro&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=25	https://www.youtube.com/watch?v=jfj2IoC6Rks&list=RDjfj2IoC6Rks&start_radio=1
Serdar Ortaç - Karabiberim	https://www.youtube.com/watch?v=Cg16C85FyEQ&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=26	https://www.youtube.com/watch?v=-_aF_HO2O-o&list=RD-_aF_HO2O-o&start_radio=1
Serdar Ortaç - Ben Adam Olmam	https://www.youtube.com/watch?v=IxBEG2JRm3I&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=27	https://www.youtube.com/watch?v=aZDuOpabeng&list=RDaZDuOpabeng&start_radio=1
Burak Kut - Benimle Oynama	https://www.youtube.com/watch?v=vgqHhAwlYmg&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=33	https://www.youtube.com/watch?v=6eFytaWQOVI&list=RD6eFytaWQOVI&start_radio=1
Destan-Cilveloy	https://www.youtube.com/watch?v=btn09hwF3pc&list=RDbtn09hwF3pc&start_radio=1	https://www.youtube.com/watch?v=JMDvSCZ9pBc&list=RDJMDvSCZ9pBc&start_radio=1
Yaşar-Birtanem	https://www.youtube.com/watch?v=MRsF_H_6w48&list=RDMRsF_H_6w48&start_radio=1	https://www.youtube.com/watch?v=cOjyVsrWNFI&list=RDcOjyVsrWNFI&start_radio=1
Mirkelam-Her Gece	https://www.youtube.com/watch?v=7w9IDP_OR9M&list=RD7w9IDP_OR9M&start_radio=1	https://www.youtube.com/watch?v=ZxNLeYymtUc&list=RDZxNLeYymtUc&start_radio=1
Harun Kolçak-Vermem Seni	https://www.youtube.com/watch?v=9qsxPw2OlDA&list=RD9qsxPw2OlDA&start_radio=1	https://www.youtube.com/watch?v=v2yBoX4eF7k&list=RDv2yBoX4eF7k&start_radio=1
Candan Erçetin-Sevdim Sevilmedim	https://www.youtube.com/watch?v=mtLwmoYxD34&list=RDmtLwmoYxD34&start_radio=1	https://www.youtube.com/watch?v=r5iE1ato0fk&list=RDr5iE1ato0fk&start_radio=1
Serdar Ortaç - Gamzelim	https://www.youtube.com/watch?v=UGhQ90SHECQ&list=RDUGhQ90SHECQ&start_radio=1	https://www.youtube.com/watch?v=15-jhCeLBj8&list=RD15-jhCeLBj8&start_radio=1
Ayşegül Aldinç-Allimallah	https://www.youtube.com/watch?v=Q2YlgVRqC-U&list=RDQ2YlgVRqC-U&start_radio=1	https://www.youtube.com/watch?v=nKu3gtB33QY&list=RDnKu3gtB33QY&start_radio=1
Reyhan Karaca-Sevdik Sevdalandık	https://www.youtube.com/watch?v=qW8jN3SB5u8	https://www.youtube.com/watch?v=Y4Q_gdvbqpc
Nilüfer-Yalnızlık	https://www.youtube.com/watch?v=rLk5u7OawIo	https://www.youtube.com/watch?v=pyVdwr1TTC0
Ajda Pekkan-Eline,Gözüne,Dizine Dursun	https://www.youtube.com/watch?v=QhL3lXjtB5U	https://www.youtube.com/watch?v=QhL3lXjtB5U&list=RDQhL3lXjtB5U&start_radio=1
Aşkın Nur Yengi-Yalancı Bahar	https://www.youtube.com/watch?v=kGkezfjlDlQ	https://www.youtube.com/watch?v=kGkezfjlDlQ&list=RDkGkezfjlDlQ&start_radio=1
Aşkın Nur Yengi - Yalancı Bahar	https://www.youtube.com/watch?v=kGkezfjlDlQ&list=RDkGkezfjlDlQ&start_radio=1	https://www.youtube.com/watch?v=v5XZOGFOoOE&list=RDv5XZOGFOoOE&start_radio=1`
  );

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [isDBActionRunning, setIsDBActionRunning] = useState(false);

  const songRequestsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "song_requests");
  }, [firestore]);

  const auditLogsQuery = useMemoFirebase(() => {
    if (!firestore || role !== "owner") return null;
    return collection(firestore, "audit_logs");
  }, [firestore, role]);

  const { data: songs, isLoading: songsLoading } =
    useCollection<Song>(songRequestsQuery);
  const { data: auditLogs, isLoading: logsLoading } =
    useCollection<AuditLog>(auditLogsQuery);

  // ✅ Owner panel açıkken yeni istek gelince toast
  useOwnerSongRequestToast({ role, songs, toast });

  const logAction = async (action: string, songTitle: string) => {
    if (!firestore || !user || role !== "owner") return;
    try {
      const logRef = doc(collection(firestore, "audit_logs"));
      await updateDocumentNonBlocking(logRef, {
        action,
        songTitle,
        performedBy: role,
        timestamp: serverTimestamp(),
      } as any);
    } catch {
      // log fail = ignore
    }
  };

  const handleBulkAdd = async (useDefaultList = false) => {
    if (!firestore || !user) return;
    setIsDBActionRunning(true);

    const textToProcess = useDefaultList
      ? bulkText
      : (document.getElementById("bulk-textarea") as HTMLTextAreaElement)?.value ||
        "";

    if (!textToProcess.trim()) {
      toast({
        variant: "destructive",
        title: "Liste Boş",
        description: "Eklenecek şarkı bulunamadı.",
      });
      setIsDBActionRunning(false);
      return;
    }

    const entries = parseBulkInput(textToProcess);
    const batch = writeBatch(firestore);
    const logsBatch = writeBatch(firestore);

    let successCount = 0;
    let errorCount = 0;

    entries.forEach((entry) => {
      const songTitle = entry.songTitle?.trim();
      const songLink = entry.songLink?.trim();
      const karaokeLink = entry.karaokeLink?.trim();

      if (songTitle && karaokeLink) {
        const newSongRef = doc(collection(firestore, "song_requests"));
        batch.set(newSongRef, {
          studentName: "Sahip Tarafından Eklendi",
          songTitle,
          songLink: songLink || null,
          karaokeLink,
          status: "approved",
          createdAt: serverTimestamp(),
          studentId: user.uid,
        });

        const newLogRef = doc(collection(firestore, "audit_logs"));
        logsBatch.set(newLogRef, {
          action: "Toplu olarak eklendi ve onaylandı",
          songTitle,
          performedBy: role,
          timestamp: serverTimestamp(),
        });
        successCount++;
      } else {
        errorCount++;
      }
    });

    // If parse found nothing, fallback to old behavior by counting as errors
    if (!entries.length) {
      errorCount = textToProcess.trim().split("\n").filter(Boolean).length;
    }

    try {
      await batch.commit();
      await logsBatch.commit();

      toast({
        title: "Toplu Ekleme Başarılı",
        description: `${successCount} şarkı eklendi. Hatalı satır: ${errorCount}.`,
      });

      if (!useDefaultList) setBulkText("");
    } catch (error) {
      console.error("Bulk add failed:", error);
      toast({
        variant: "destructive",
        title: "Toplu Ekleme Başarısız",
        description: "Şarkılar eklenirken hata oluştu.",
      });
    } finally {
      setIsDBActionRunning(false);
      setShowAddConfirm(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!firestore) return;
    setIsDBActionRunning(true);

    try {
      const snap = await getDocs(collection(firestore, "song_requests"));
      const batch = writeBatch(firestore);
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();

      toast({
        title: "Hepsi Silindi",
        description: "Tüm şarkılar silindi.",
      });
    } catch (error) {
      console.error("Delete all failed:", error);
      toast({
        variant: "destructive",
        title: "Silme Başarısız",
        description: "Şarkılar silinirken hata oluştu.",
      });
    } finally {
      setIsDBActionRunning(false);
      setShowDeleteConfirm(false);
    }
  };

  const setStatus = (song: Song, status: "approved" | "rejected" | "pending") => {
    if (!firestore) return;
    const songRef = doc(firestore, "song_requests", song.id);
    updateDocumentNonBlocking(songRef, { status } as any);
    logAction(`Durum "${status}" olarak değiştirildi`, song.songTitle);
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !editingSong) return;

    const formData = new FormData(e.currentTarget);

    const updatedSong = {
      studentName: formData.get("studentName") as string,
      songTitle: formData.get("songTitle") as string,
      songLink: ((formData.get("songLink") as string) || "").trim() || null,
      karaokeLink: formData.get("karaokeLink") as string,
    };

    const songRef = doc(firestore, "song_requests", editingSong.id);
    updateDocumentNonBlocking(songRef, updatedSong as any);
    logAction("Düzenlendi", editingSong.songTitle);
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

  return (
    <VHSStage>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-neutral-200">Admin Panel</h1>
          <Link href="/" className="text-sm text-neutral-400 hover:underline">
            Ana sayfa
          </Link>
        </div>

        <Tabs defaultValue="queue" className="w-full">
          <TabsList>
            <TabsTrigger value="queue">Sıra</TabsTrigger>
            {role === "owner" && <TabsTrigger value="bulk-add">Toplu Ekle</TabsTrigger>}
            {role === "owner" && <TabsTrigger value="logs">Kayıtlar</TabsTrigger>}
          </TabsList>

          <TabsContent value="queue" className="mt-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-bold text-neutral-300">
                Şarkı İstekleri
              </h2>

              {role === "owner" && (
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isDBActionRunning}
                  >
                    Tüm Listeyi Sil
                  </Button>
                </div>
              )}
            </div>

            {songsLoading ? (
              <div className="text-neutral-400">Yükleniyor...</div>
            ) : (
              <div className="flex flex-col gap-3">
                {sortedSongs.length === 0 ? (
                  <div className="text-neutral-500">
                    Henüz istek yok.
                  </div>
                ) : (
                  sortedSongs.map((s) => (
                    <SongRow
                      key={s.id}
                      s={s}
                      role={role}
                      onEdit={() => setEditingSong(s)}
                      onDelete={() => setDeletingSong(s)}
                      onSetStatus={setStatus}
                    />
                  ))
                )}
              </div>
            )}
          </TabsContent>

          {role === "owner" && (
            <TabsContent value="bulk-add" className="mt-6">
              <h2 className="text-xl font-bold mb-3 text-neutral-300">
                Şarkıları Toplu Ekle
              </h2>

              <section className="border border-neutral-800 bg-neutral-950/50 rounded-xl p-4">
                <div className="text-sm text-neutral-400 mb-3">
                  Format:
                  <p className="mt-2">
                    <code className="text-neutral-200">
                      Şarkı Adı&lt;TAB&gt;Normal Link&lt;TAB&gt;Karaoke Linki
                    </code>
                  </p>
                </div>

                <Textarea
                  id="bulk-textarea"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={
                    "Şarkı Adı<TAB>Normal Link<TAB>Karaoke Link\nÖrn: Şebnem Ferah-Sil Baştan\thttps://youtube.com/...\thttps://youtube.com/..."
                  }
                  className="retro-input-soft min-h-[200px]"
                  rows={10}
                />

                <div className="flex justify-end gap-2 mt-3">
                  <Button
                    variant="secondary"
                    onClick={() => setShowAddConfirm(true)}
                    disabled={isDBActionRunning}
                  >
                    Varsayılan Listeyi Ekle
                  </Button>
                  <Button
                    onClick={() => handleBulkAdd(false)}
                    disabled={isDBActionRunning}
                  >
                    {isDBActionRunning ? "Ekleniyor..." : "Metin Alanındaki Listeyi Ekle"}
                  </Button>
                </div>
              </section>
            </TabsContent>
          )}

          {role === "owner" && (
            <TabsContent value="logs" className="mt-6">
              <h2 className="text-xl font-bold mb-3 text-neutral-300">
                Denetim Kayıtları
              </h2>

              <section className="border border-neutral-800 bg-neutral-950/50 rounded-xl p-4">
                {logsLoading ? (
                  <div className="text-neutral-400">Yükleniyor...</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {sortedLogs.length === 0 ? (
                      <div className="text-neutral-500">Log yok.</div>
                    ) : (
                      sortedLogs.map((l) => {
                        const when = l.timestamp?.toDate
                          ? formatDistanceToNow(l.timestamp.toDate(), {
                              addSuffix: true,
                              locale: tr,
                            })
                          : "—";
                        return (
                          <div
                            key={l.id}
                            className="p-2 rounded border border-neutral-800 bg-neutral-950/40 text-sm"
                          >
                            <div className="text-neutral-400">{when}</div>
                            <div className="text-neutral-200">
                              <strong className="text-emerald-300">{l.performedBy}</strong>
                              {" — "}
                              {l.action}
                              {" — "}
                              <span className="text-fuchsia-200">{l.songTitle}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </section>
            </TabsContent>
          )}
        </Tabs>
      </div>

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
              <Input name="songLink" defaultValue={editingSong?.songLink || ""} placeholder="Normal Link" />
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
              Bu işlem geri alınamaz. "{deletingSong?.songTitle}" şarkısını listeden kalıcı olarak silmek istiyor musunuz?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!firestore || !deletingSong) return;
                const ref = doc(firestore, "song_requests", deletingSong.id);
                deleteDocumentNonBlocking(ref);
                logAction("Silindi", deletingSong.songTitle);
                setDeletingSong(null);
              }}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Confirm */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tüm Liste Silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Tüm şarkı istekleri silinecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteAll()}>
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Add Confirm */}
      <AlertDialog open={showAddConfirm} onOpenChange={setShowAddConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Varsayılan Liste Eklensin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              Varsayılan listedeki tüm şarkılar eklenip otomatik onaylanacak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleBulkAdd(true)}>
              Ekle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </VHSStage>
  );
};

// --- Main Page Component ---
export default function AdminPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  // owner: gizli_bkara90ke
  const OWNER_HASH = "0a8a46f5c4a84c9f35cf8f8a231d1936";
  // admin: bkara90ke
  const ADMIN_HASH = "bfbb9631e2d34e8875654a7402a19f1b";

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

  if (!role) {
    return <LoginForm onLogin={handleLogin} error={error} />;
  }

  return <AdminPanel role={role} />;
}
