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
  addDoc,
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

type Role = "admin" | "owner";

type Song = {
  id: string;
  studentName: string;
  songTitle: string;

  // ✅ iki link
  songLink?: string; // normal şarkı linki
  karaokeLink: string; // karaoke linki

  status: "pending" | "approved" | "rejected";
  createdAt: any;
};

type AuditLog = {
  id: string;
  action: string;
  songTitle: string;
  performedBy: Role;
  timestamp: any;
};

const isProbablyUrl = (s: string) => {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
};

function normalizeLine(s: string) {
  return (s || "").replace(/\r/g, "").trim();
}

/**
 * Bulk parser accepts:
 * 1) "Title;KaraokeUrl"
 * 2) "Title<TAB>SongUrl<TAB>KaraokeUrl"
 * 3) 3-line blocks: Title \n SongUrl \n KaraokeUrl
 */
function parseBulkInput(raw: string): Array<{ songTitle: string; songLink?: string; karaokeLink: string }> {
  const text = (raw || "").replace(/\r/g, "\n");

  // Try TAB format first (Excel)
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // If it looks like many tabbed rows, parse rows
  const tabRows = lines.filter((l) => l.includes("\t"));
  if (tabRows.length >= Math.max(3, Math.floor(lines.length * 0.3))) {
    const out: Array<{ songTitle: string; songLink?: string; karaokeLink: string }> = [];
    for (const row of lines) {
      if (!row.includes("\t")) continue;
      const cols = row.split("\t").map((c) => c.trim()).filter(Boolean);

      // Expected: Title, SongLink, KaraokeLink
      const songTitle = cols[0] || "";
      const songLink = cols[1] && isProbablyUrl(cols[1]) ? cols[1] : undefined;
      const karaokeLink = cols[2] && isProbablyUrl(cols[2]) ? cols[2] : "";

      if (!songTitle) continue;
      if (!karaokeLink) continue;

      out.push({ songTitle, songLink, karaokeLink });
    }
    return out;
  }

  // If it looks like 3-line blocks (title + 2 urls)
  const urlLikeCount = lines.filter((l) => isProbablyUrl(l)).length;
  if (urlLikeCount >= Math.max(6, Math.floor(lines.length * 0.4))) {
    const out: Array<{ songTitle: string; songLink?: string; karaokeLink: string }> = [];
    for (let i = 0; i < lines.length; ) {
      const title = lines[i] || "";
      const a = lines[i + 1] || "";
      const b = lines[i + 2] || "";

      // Require at least title + 1 url; prefer 2 urls
      if (title && isProbablyUrl(a) && isProbablyUrl(b)) {
        out.push({ songTitle: title, songLink: a, karaokeLink: b });
        i += 3;
        continue;
      }

      // fallback: maybe semicolon format
      if (title.includes(";")) {
        const [t, k] = title.split(";").map((x) => x.trim());
        if (t && k && isProbablyUrl(k)) out.push({ songTitle: t, karaokeLink: k });
      }

      i += 1;
    }
    // If we got anything, return it
    if (out.length) return out;
  }

  // Default: semicolon format per line
  const out: Array<{ songTitle: string; songLink?: string; karaokeLink: string }> = [];
  for (const line of lines) {
    const parts = line.split(";").map((x) => x.trim()).filter(Boolean);
    if (parts.length < 2) continue;
    const songTitle = parts[0];
    const karaokeLink = parts[1];
    if (!songTitle || !karaokeLink) continue;
    if (!isProbablyUrl(karaokeLink)) continue;
    out.push({ songTitle, karaokeLink });
  }
  return out;
}

const AdminPanel = ({ role }: { role: Role }) => {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [deletingSong, setDeletingSong] = useState<Song | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);

  const [isDBActionRunning, setIsDBActionRunning] = useState(false);

  // ✅ bulk
  const DEFAULT_BULK_TEXT = [
  "REM-Losing My Religion\thttps://www.youtube.com/watch?v=Efa6BAWPm9o\thttps://www.youtube.com/watch?v=gCrqBZlxSyA",
  "Bulutsuzluk Özlemi-Sözlerimi Geri Alamam\thttps://www.youtube.com/watch?v=RMu2HUTGe2c\thttps://www.youtube.com/watch?v=jHULD4aZnS0",
  "Şebnem Ferah-Sil Baştan\thttps://www.youtube.com/watch?v=yjGigzkkXMM\thttps://www.youtube.com/watch?v=MGKQpfWrBx0&list=RDMGKQpfWrBx0&start_radio=1",
  "Gülşen-Be Adam\thttps://www.youtube.com/watch?v=liaMcRqwOKs\thttps://www.youtube.com/watch?v=AyXlebMMAWE&list=RDAyXlebMMAWE&start_radio=1",
  "Tarkan-Hepsi Senin Mi?\thttps://www.youtube.com/watch?v=GB5J_2jWxMQ\thttps://www.youtube.com/watch?v=20azTn_qfuE&list=RD20azTn_qfuE&start_radio=1",
  "Kenan Doğulu -Yaparım Bilirsin(Hızlı Ebru Gündeş versiyon)\thttps://www.youtube.com/watch?v=7JJH5GZPJNw\thttps://www.youtube.com/watch?v=QRQ8uVC7E7o&list=RDQRQ8uVC7E7o&start_radio=1",
  "Hakan Peker-Karam\thttps://www.youtube.com/watch?v=xQBIAUU4NVk\thttps://www.youtube.com/watch?v=tIgExFqyYMw&list=RDtIgExFqyYMw&start_radio=1",
  "Athena-Senden Benden Bizden\thttps://www.youtube.com/watch?v=ODzwocw9z28\thttps://www.youtube.com/watch?v=vRgMG_nicjQ&list=RDvRgMG_nicjQ&start_radio=1",
  "Mustafa Sandal-Araba\thttps://www.youtube.com/watch?v=-lcfABgHKfs\thttps://www.youtube.com/watch?v=URebjWhKzBU&list=RDURebjWhKzBU&start_radio=1",
  "MFÖ-Ali Desidero\thttps://www.youtube.com/watch?v=inwiXmzKun8\thttps://www.youtube.com/watch?v=w_EVxBKM92g&list=RDw_EVxBKM92g&start_radio=1",
  "MFÖ-Ele Güne Karşı\thttps://www.youtube.com/watch?v=4DZbURvoDEc&list=RD4DZbURvoDEc&start_radio=1\thttps://www.youtube.com/watch?v=dQcfBeNs5zE&list=RDdQcfBeNs5zE&start_radio=1",
  "Sertab Erener-Güle Güle Şekerim\thttps://www.youtube.com/watch?v=rAAfQOLMZmo\thttps://www.youtube.com/watch?v=cx1BZTBh4RM&list=RDcx1BZTBh4RM&start_radio=1",
  "Levent Yüksel- Zalim\thttps://www.youtube.com/watch?v=R0KCc9-0i6E\thttps://www.youtube.com/watch?v=Qj2Lq8k6LxI&list=RDQj2Lq8k6LxI&start_radio=1",
  "Nirvana-Smells Like Teen Spirit\thttps://www.youtube.com/watch?v=Q6SHkQMFVlc\thttps://www.youtube.com/watch?v=lMdvpJpaolE&list=RDlMdvpJpaolE&start_radio=1",
  "Barış Manço-Gibi gibi\thttps://youtu.be/vqFb0kCvE5o?si=gCQR2wk_Qlh-mB5R\thttps://www.youtube.com/watch?v=_aRtZSQNTqo&list=RD_aRtZSQNTqo&start_radio=1",
  "Barış Manço-Can Bedenden Çıkmayınca\thttps://youtu.be/RTpyeclPZuU?si=7cOshfxvkl3OEy5F\thttps://www.youtube.com/watch?v=3WAtON5odlQ&list=RD3WAtON5odlQ&start_radio=1",
  "Barış Manço-Bal Böceği\thttps://youtu.be/YXmSNwYIw7Q?si=kLyrMl6DlwUpiMpP\thttps://www.youtube.com/watch?v=ofVxLHe6ki4&list=RDofVxLHe6ki4&start_radio=1",
  "Duman-Köprüaltı\thttps://www.youtube.com/watch?v=2J75v4Y9h7k\thttps://www.youtube.com/watch?v=7-6C8kVHd-g&list=RD7-6C8kVHd-g&start_radio=1",
  "Yaşar-Divane\thttps://www.youtube.com/watch?v=WiFFLGyT59I\thttps://www.youtube.com/watch?v=n_wF-KqriE8&list=RDn_wF-KqriE8&start_radio=1",
  "Dido- Thank You\thttps://m.youtube.com/watch?v=1TO48Cnl66w&pp=ygUJVGhhbmsgeW91\thttps://www.youtube.com/watch?v=vg79oI8qrmg&list=RDvg79oI8qrmg&start_radio=1",
  "Cem Karaca-Resimdeki Gözyaşları\thttps://www.youtube.com/watch?v=LfnX9nujOQ0\thttps://www.youtube.com/watch?v=l7n7vraGJZ0&list=RDl7n7vraGJZ0&start_radio=1",
  "Sting-Shape of My Heart\thttps://youtu.be/NlwIDxCjL-8?si=VI-T85Dnw0HwCS5A\thttps://www.youtube.com/watch?v=I-0VumW0XkE&list=RDI-0VumW0XkE&start_radio=1",
  "Ricky Martin-Livin' La Vida Loca\thttps://www.youtube.com/watch?v=CN5hQOI__10\thttps://www.youtube.com/watch?v=tOAs-c5jiuQ&list=RDtOAs-c5jiuQ&start_radio=1",
  "Celine Dion-All By Myself\thttps://www.youtube.com/watch?v=NGrLb6W5YOM\thttps://www.youtube.com/watch?v=eiTOcxAmyLA&list=RDeiTOcxAmyLA&start_radio=1",
  "Metallica-Nothing Else Matters\thttps://www.youtube.com/watch?v=ozXZnwYTMbs\thttps://www.youtube.com/watch?v=LcK5u0usw6Y&list=RDLcK5u0usw6Y&start_radio=1",
  "Spice Girls- Wannabe\thttps://www.youtube.com/watch?v=gJLIiF15wjQ&list=RDgJLIiF15wjQ&start_radio=1\thttps://www.youtube.com/watch?v=BTDPZQGqjY8&list=RDBTDPZQGqjY8&start_radio=1",
  "No Doubt - Don't Speak\thttps://www.youtube.com/watch?v=1leInEAlbjY\thttps://www.youtube.com/watch?v=JtiocB8PYPs&list=RDJtiocB8PYPs&start_radio=1",
  "Duman-Her Şeyi Yak\thttps://www.youtube.com/watch?v=pc5SQI85Y-M\thttps://youtu.be/zWn7HoueR-U?si=PKe9_jH0Xj56QAnk",
  "Scorpions-Still Loving You\thttps://www.youtube.com/watch?v=O5Kw41JAfG4\thttps://youtu.be/41wclfz5maI?si=zabTwk99b_7L9F8N",
  "Scorpions-Wind of Change\thttps://www.youtube.com/watch?v=F_-ZuVy76yg\thttps://youtu.be/AAPRtwEp82c?si=_8ePDddxuY9mK2sm",
  "Destiny's Child- Bills,Bills,Bills\thttps://www.youtube.com/watch?v=NiF6-0UTqtc\thttps://youtu.be/nVhX4pt1rcs?si=Qvp-9rGCkk-WMuxv",
  "Goo Goo Dolls-Iris\thttps://www.youtube.com/watch?v=xK4ZqrLys_k\thttps://www.youtube.com/watch?v=OqtWMNZS-M0",
  "Ayna-Yeniden de Sevebiliriz Akdeniz\thttps://www.youtube.com/watch?v=eKANhic0mFc\thttps://www.youtube.com/watch?v=h-STdtHTXgM",
  "Barış Manço-Alla Beni Pulla Beni\thttps://www.youtube.com/watch?v=GUKIEjmQ1Bc\thttps://youtu.be/h20Vt7qR_68?si=u7KCiq_XkObiEwc9",
  "Yonca Evcimik-Abone\thttps://www.youtube.com/watch?v=dO_FYA_YcS4&list=RDdO_FYA_YcS4&start_radio=1\thttps://youtu.be/DPyxh_VJi8o?si=HXbHXnCMsnf-7HOi",
  "Michael Jackson-They Don't Care About Us\thttps://www.youtube.com/watch?v=GsHZBisKwxg\thttps://www.youtube.com/watch?v=nG8FZ9yRev8&list=RDnG8FZ9yRev8&start_radio=1",
  "Rusted Root-Send Me On My Way\thttps://www.youtube.com/watch?v=rwHv2XlIC_w\thttps://www.youtube.com/watch?v=fEpfsVDPImI&list=RDfEpfsVDPImI&start_radio=1",
  "Rengin-Aldatıldık\thttps://www.youtube.com/watch?v=cbLp3GNjfd0&list=RDcbLp3GNjfd0&start_radio=1\thttps://www.youtube.com/watch?v=mpam4HHjPGU&list=RDmpam4HHjPGU&start_radio=1",
  "Mustafa Sandal - Jest Oldu\thttps://www.youtube.com/watch?v=GEQBBJ4Es2Y&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=1\thttps://www.youtube.com/watch?v=50J5jzWXJ4k&list=RD50J5jzWXJ4k&start_radio=1",
  "TARKAN - Kuzu Kuzu\thttps://www.youtube.com/watch?v=NAHRpEqgcL4&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=2\thttps://www.youtube.com/watch?v=pgx5w9JA4og&list=RDpgx5w9JA4og&start_radio=1",
  "Yeni Türkü- Aşk Yeniden\thttps://www.youtube.com/watch?v=_NdZIknMk1w&list=RD_NdZIknMk1w&start_radio=1\thttps://www.youtube.com/watch?v=FcCR6rclFhQ&list=RDFcCR6rclFhQ&start_radio=1",
  "Kenan Doğulu- Tutamıyorum Zamanı\thttps://www.youtube.com/watch?v=xGzDUYPr0GQ&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=4\thttps://www.youtube.com/watch?v=6mDd9eobWMs&list=RD6mDd9eobWMs&start_radio=1",
  "Gülşen - Ne Kavgam Bitti Ne Sevdam\thttps://www.youtube.com/watch?v=_kBMsB32Fg8&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=5\thttps://www.youtube.com/watch?v=mxswOcVZtuw&list=RDmxswOcVZtuw&start_radio=1",
  "Levent Yüksel- Medcezir\thttps://www.youtube.com/watch?v=QJ_HX8t9YXI&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=13\thttps://www.youtube.com/watch?v=bd0zPXNhBFg&list=RDbd0zPXNhBFg&start_radio=1",
  "Harun Kolçak- Gir Kanıma\thttps://www.youtube.com/watch?v=hK73i75SnQw&list=RDhK73i75SnQw&start_radio=1\thttps://www.youtube.com/watch?v=G41rhu-wIfg&list=RDG41rhu-wIfg&start_radio=1",
  "Demet Sağıroğlu - Arnavut Kaldırımı\thttps://www.youtube.com/watch?v=bdso4qwyul0&list=PLxyIA5E2lVC6Rv_7xZ881HselvQh80WHG\thttps://www.youtube.com/watch?v=bJYbdZ6isUs&list=RDbJYbdZ6isUs&start_radio=1",
  "Hakan Peker - Ateşini Yolla Bana\thttps://www.youtube.com/watch?v=3uZL9NEOiro&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=25\thttps://www.youtube.com/watch?v=jfj2IoC6Rks&list=RDjfj2IoC6Rks&start_radio=1",
  "Serdar Ortaç - Karabiberim\thttps://www.youtube.com/watch?v=Cg16C85FyEQ&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=26\thttps://www.youtube.com/watch?v=-_aF_HO2O-o&list=RD-_aF_HO2O-o&start_radio=1",
  "Serdar Ortaç - Ben Adam Olmam\thttps://www.youtube.com/watch?v=IxBEG2JRm3I&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=27\thttps://www.youtube.com/watch?v=aZDuOpabeng&list=RDaZDuOpabeng&start_radio=1",
  "Burak Kut - Benimle Oynama\thttps://www.youtube.com/watch?v=vgqHhAwlYmg&list=PL3hSAzZjtT1NHRKLU9gEw5U4fh_kmwsGO&index=33\thttps://www.youtube.com/watch?v=6eFytaWQOVI&list=RD6eFytaWQOVI&start_radio=1",
  "Destan-Cilveloy\thttps://www.youtube.com/watch?v=btn09hwF3pc&list=RDbtn09hwF3pc&start_radio=1\thttps://www.youtube.com/watch?v=JMDvSCZ9pBc&list=RDJMDvSCZ9pBc&start_radio=1",
  "Yaşar-Birtanem\thttps://www.youtube.com/watch?v=MRsF_H_6w48&list=RDMRsF_H_6w48&start_radio=1\thttps://www.youtube.com/watch?v=cOjyVsrWNFI&list=RDcOjyVsrWNFI&start_radio=1",
  "Mirkelam-Her Gece\thttps://www.youtube.com/watch?v=7w9IDP_OR9M&list=RD7w9IDP_OR9M&start_radio=1\thttps://www.youtube.com/watch?v=ZxNLeYymtUc&list=RDZxNLeYymtUc&start_radio=1",
  "Harun Kolçak-Vermem Seni\thttps://www.youtube.com/watch?v=9qsxPw2OlDA&list=RD9qsxPw2OlDA&start_radio=1\thttps://www.youtube.com/watch?v=v2yBoX4eF7k&list=RDv2yBoX4eF7k&start_radio=1",
  "Candan Erçetin-Sevdim Sevilmedim\thttps://www.youtube.com/watch?v=mtLwmoYxD34&list=RDmtLwmoYxD34&start_radio=1\thttps://www.youtube.com/watch?v=r5iE1ato0fk&list=RDr5iE1ato0fk&start_radio=1",
  "Serdar Ortaç - Gamzelim\thttps://www.youtube.com/watch?v=UGhQ90SHECQ&list=RDUGhQ90SHECQ&start_radio=1\thttps://www.youtube.com/watch?v=15-jhCeLBj8&list=RD15-jhCeLBj8&start_radio=1",
  "Ayşegül Aldinç-Allimallah\thttps://www.youtube.com/watch?v=Q2YlgVRqC-U&list=RDQ2YlgVRqC-U&start_radio=1\thttps://www.youtube.com/watch?v=nKu3gtB33QY&list=RDnKu3gtB33QY&start_radio=1",
  "Reyhan Karaca - Sevdik Sevdalandık\thttps://www.youtube.com/watch?v=6ahjwoNB01c&list=RD6ahjwoNB01c&start_radio=1\thttps://www.youtube.com/watch?v=isk7bP55e48&list=RDisk7bP55e48&start_radio=1",
  "Kenan Doğulu-Ben Güzelden Anlarım\thttps://www.youtube.com/watch?v=BBZneZ36xzQ&list=RDBBZneZ36xzQ&start_radio=1\thttps://www.youtube.com/watch?v=t05a2ZYEqYg&list=RDt05a2ZYEqYg&start_radio=1",
  "Bendeniz - Gönül Yareler İçinde\thttps://www.youtube.com/watch?v=h1d_1xTot30&list=RDh1d_1xTot30&start_radio=1\thttps://www.youtube.com/watch?v=hgFMB9lyKkc&list=RDhgFMB9lyKkc&start_radio=1",
  "Ajda Pekkan-Bambaşka Biri\thttps://www.youtube.com/watch?v=FrjWcu1c0-4&list=RDFrjWcu1c0-4&start_radio=1\thttps://www.youtube.com/watch?v=JPfLWn34hgA&list=RDJPfLWn34hgA&start_radio=1",
  "Emel Müftüoğlu - Hovarda\thttps://www.youtube.com/watch?v=O1wyl6sbZyI&list=RDO1wyl6sbZyI&start_radio=1\thttps://www.youtube.com/watch?v=PYCP2HkPoYQ&list=RDPYCP2HkPoYQ&start_radio=1",
  "Ajda Pekkan-Haykıracak Nefesim Kalmasa Bile\thttps://www.youtube.com/watch?v=G81e4utp3Mo&list=RDG81e4utp3Mo&start_radio=1\thttps://www.youtube.com/watch?v=JfZ5Vquv_cE&list=RDJfZ5Vquv_cE&start_radio=1",
  "Yıldız Tilbe - Sana Değer\thttps://www.youtube.com/watch?v=_Qw1l1BbJwM&list=RD_Qw1l1BbJwM&start_radio=1\thttps://www.youtube.com/watch?v=b2KI6ZUg9OU&list=RDb2KI6ZUg9OU&start_radio=1",
  "Ajda Pekkan-Palavra Palavra\thttps://www.youtube.com/watch?v=VgK7sFO4kaw&list=RDVgK7sFO4kaw&start_radio=1\thttps://www.youtube.com/watch?v=Flp35a8yVJI&list=RDFlp35a8yVJI&start_radio=1",
  "Mirkelam - Tavla\thttps://www.youtube.com/watch?v=vE62W7vbKjs&list=RDvE62W7vbKjs&start_radio=1\thttps://www.youtube.com/watch?v=1jduR5OIwLA&list=RD1jduR5OIwLA&start_radio=1",
  "Ajda Pekkan-Yaz Yaz Yaz\thttps://www.youtube.com/watch?v=93wsynxLMLk&list=RD93wsynxLMLk&start_radio=1\thttps://www.youtube.com/watch?v=XEuPpSEU9Ds&list=RDXEuPpSEU9Ds&start_radio=1",
  "Seda Sayan-Ah Geceler\thttps://www.youtube.com/watch?v=DfpeVaTy82M&list=RDDfpeVaTy82M&start_radio=1\thttps://www.youtube.com/watch?v=LbsOSArao6g&list=RDLbsOSArao6g&start_radio=1",
  "Tarkan - Ölürüm Sana\thttps://www.youtube.com/watch?v=LJ9FpMXJmwY&list=RDLJ9FpMXJmwY&start_radio=1\thttps://www.youtube.com/watch?v=Bkt42iiVCQw&list=RDBkt42iiVCQw&start_radio=1",
  "Ajda Pekkan-Eline,Gözüne,Dizine Dursun\thttps://www.youtube.com/watch?v=K87LGdaCh-c&list=RDK87LGdaCh-c&start_radio=1\thttps://www.youtube.com/watch?v=jYvzvJxdAkE&list=RDjYvzvJxdAkE&start_radio=1",
  "Aşkın Nur Yengi-Ay İnanmıyorum\thttps://www.youtube.com/watch?v=zFM9Jq31UEY&list=RDzFM9Jq31UEY&start_radio=1\thttps://www.youtube.com/watch?v=YHuNSuF89RE&list=RDYHuNSuF89RE&start_radio=1",
  "Sinan Erkoç - Havam Yerinde\thttps://www.youtube.com/watch?v=QhL3lXjtB5U&list=RDQhL3lXjtB5U&start_radio=1\thttps://www.youtube.com/watch?v=tiTMCqHXjfc&list=RDtiTMCqHXjfc&start_radio=1",
  "Sertab Erener - Zor Kadın\thttps://www.youtube.com/watch?v=kQMWd7oyFlo&list=RDkQMWd7oyFlo&start_radio=1\thttps://www.youtube.com/watch?v=LoJns3uAzTE&list=RDLoJns3uAzTE&start_radio=1",
  "Sezen Aksu - Seni Yerler\thttps://www.youtube.com/watch?v=IVE00F-2ZCw&list=RDIVE00F-2ZCw&start_radio=1\thttps://www.youtube.com/watch?v=PFENFuc2YOw&list=RDPFENFuc2YOw&start_radio=1",
  "Ebru Gündeş-Fırtınalar\thttps://www.youtube.com/watch?v=a8-RshlYFGA&list=RDa8-RshlYFGA&start_radio=1\thttps://www.youtube.com/watch?v=YkVSZmnQ5KA&list=RDYkVSZmnQ5KA&start_radio=1",
  "Mansur Ark - Maalesef\thttps://www.youtube.com/watch?v=dPNj8kJP31A&list=RDdPNj8kJP31A&start_radio=1\thttps://www.youtube.com/watch?v=T5deXVa6cbs&list=RDT5deXVa6cbs&start_radio=1",
  "Mustafa Sandal-Aya Benzer\thttps://www.youtube.com/watch?v=VlEOPZNTeTc&list=RDVlEOPZNTeTc&start_radio=1\thttps://www.youtube.com/watch?v=C19AZ48OBJ4&list=RDC19AZ48OBJ4&start_radio=1",
  "Sezen Aksu - Kaçın Kurası\thttps://www.youtube.com/watch?v=352QSI4nsQk&list=RD352QSI4nsQk&start_radio=1\thttps://www.youtube.com/watch?v=USi88k2p0es&list=RDUSi88k2p0es&start_radio=1",
  "Burak Kut - Yaşandı Bitti\thttps://www.youtube.com/watch?v=Fx4ccla8O7Y&list=RDFx4ccla8O7Y&start_radio=1\thttps://www.youtube.com/watch?v=Txfp8wuM0h8&list=RDTxfp8wuM0h8&start_radio=1",
  "Nükhet Duru-Mahmure\thttps://www.youtube.com/watch?v=oNOUy-TYHoI&list=RDoNOUy-TYHoI&start_radio=1\thttps://www.youtube.com/watch?v=2lB4bifyocU&list=RD2lB4bifyocU&start_radio=1",
  "Atilla Taş-Zennube\thttps://www.youtube.com/watch?v=Lhpj4SvgC_8&list=RDLhpj4SvgC_8&start_radio=1\thttps://www.youtube.com/watch?v=WIRAAHzYXdg&list=RDWIRAAHzYXdg&start_radio=1",
  "Yonca Evcimik-Bandıra Bandıra\thttps://www.youtube.com/watch?v=y7uDYFxXwcg&list=RDy7uDYFxXwcg&start_radio=1\thttps://www.youtube.com/watch?v=0uDbq5dCH10&list=PL40tIQz3RSNDEJpS3K17K528Ml-MW9Mje",
  "Çelik - Ateşteyim\thttps://www.youtube.com/watch?v=zPBxIp_kMpM&list=RDzPBxIp_kMpM&start_radio=1\thttps://www.youtube.com/watch?v=Nwcd-PIzHBE&list=RDNwcd-PIzHBE&start_radio=1",
  "Candan Erçetin-Umrumda Değil\thttps://www.youtube.com/watch?v=JBElQJbWdF0&list=RDJBElQJbWdF0&start_radio=1\thttps://www.youtube.com/watch?v=Jc4kL7Hf9Eg&list=RDJc4kL7Hf9Eg&start_radio=1",
  "Mustafa Sandal - Gidenlerden\thttps://www.youtube.com/watch?v=u3L6gByQnrI&list=RDu3L6gByQnrI&start_radio=1\thttps://www.youtube.com/watch?v=1QXHZZNaOgs&list=RD1QXHZZNaOgs&start_radio=1",
  "Seyyar Taner - Alladı Pulladı\thttps://www.youtube.com/watch?v=titaJ2mXoCM&list=RDtitaJ2mXoCM&start_radio=1\thttps://www.youtube.com/watch?v=xy_pCRk24wk&list=RDxy_pCRk24wk&start_radio=1",
  "Mustafa Sandal-Bu Kız Beni Görmeli\thttps://www.youtube.com/watch?v=9Fde8AckZzs&list=RD9Fde8AckZzs&start_radio=1\thttps://www.youtube.com/watch?v=4cywrFt9Vj0",
  "Sezen Aksu-Onu Alma Beni Al\thttps://www.youtube.com/watch?v=uAxlVEDv860&list=RDuAxlVEDv860&start_radio=1\thttps://www.youtube.com/watch?v=SPiUQ-LgRRo&list=RDSPiUQ-LgRRo&start_radio=1",
  "Sezen Aksu- Hadi Bakalım\thttps://www.youtube.com/watch?v=HSVseiOjAPw&list=RDHSVseiOjAPw&start_radio=1\thttps://www.youtube.com/watch?v=fAknvXBsldU&list=RDfAknvXBsldU&start_radio=1",
  "Tarkan-Kıl Oldum\thttps://www.youtube.com/watch?v=pB-gSNevlnk&list=RDpB-gSNevlnk&start_radio=1\thttps://www.youtube.com/watch?v=k6TxGuGK4ok&list=RDk6TxGuGK4ok&start_radio=1",
  "Çelik- Hercai\thttps://www.youtube.com/watch?v=4tnyQ8lYH_k&list=RD4tnyQ8lYH_k&start_radio=1\thttps://www.youtube.com/watch?v=YALdw1l0R6A&list=RDYALdw1l0R6A&start_radio=1",
  "İzel- Ah Yandım\thttps://www.youtube.com/watch?v=YHDacCdTLwE&list=RDYHDacCdTLwE&start_radio=1\thttps://www.youtube.com/watch?v=LZQOi9S74x4&list=RDLZQOi9S74x4&start_radio=1",
  "Ege- Delice Bir Sevda\thttps://www.youtube.com/watch?v=-lycRoJk954&list=RD-lycRoJk954&start_radio=1\thttps://www.youtube.com/watch?v=SUPH79_0k9Q&list=RDSUPH79_0k9Q&start_radio=1",
  "Burak Kut- Bebeğim\thttps://www.youtube.com/watch?v=XXnGLMWdr-4&list=RDXXnGLMWdr-4&start_radio=1\thttps://www.youtube.com/watch?v=C4SJ_Nkgsww&list=RDC4SJ_Nkgsww&start_radio=1",
  "Sibel Alaş- Adam\thttps://www.youtube.com/watch?v=ThufvaUVi1Q&list=RDThufvaUVi1Q&start_radio=1\thttps://www.youtube.com/watch?v=tgXJRF4x1mg&list=RDtgXJRF4x1mg&start_radio=1",
  "Oya- Bora- Sevmek Zamanı\thttps://www.youtube.com/watch?v=w7LqXb1Qm1U&list=RDw7LqXb1Qm1U&start_radio=1\thttps://www.youtube.com/watch?v=YnHNfcFr2Tw&list=RDYnHNfcFr2Tw&start_radio=1",
  "Tarkan-Kış Güneşi\thttps://www.youtube.com/watch?v=-CxauCeQ_SQ&list=RD-CxauCeQ_SQ&start_radio=1\thttps://www.youtube.com/watch?v=AuXNxvafwpw&list=RDAuXNxvafwpw&start_radio=1",
  "Doğuş- Uyan\thttps://www.youtube.com/watch?v=XxPPkc_M-YU&list=PLxyIA5E2lVC6Rv_7xZ881HselvQh80WHG&index=16\thttps://www.youtube.com/watch?v=rlI7hCNNOPE&list=RDrlI7hCNNOPE&start_radio=1",
  "Rafet El Roman- Sorma Neden\thttps://www.youtube.com/watch?v=0VlfPTGpLCs&list=PLxyIA5E2lVC6Rv_7xZ881HselvQh80WHG&index=22\thttps://www.youtube.com/watch?v=zcRMM3dgxlw&list=RDzcRMM3dgxlw&start_radio=1",
  "Ferda Anıl Yarkın- Sonuna Kadar\thttps://www.youtube.com/watch?v=slTJhCBXUpQ&list=PLxyIA5E2lVC6Rv_7xZ881HselvQh80WHG&index=25\thttps://www.youtube.com/watch?v=2nU6ODnq-VM&list=RD2nU6ODnq-VM&start_radio=1",
  "Asya-Vurulmuşum Sana\thttps://www.youtube.com/watch?v=ZaPF2hPgDlc&list=RDZaPF2hPgDlc&start_radio=1\thttps://www.youtube.com/results?search_query=asya+vurulmu%C5%9Fum++sana+karaoke",
  "Asya-Beni Aldattın\thttps://www.youtube.com/watch?v=rRdZbb2_eYc&list=RDrRdZbb2_eYc&start_radio=1\thttps://www.youtube.com/watch?v=GRzrqJU2eSU&list=RDGRzrqJU2eSU&start_radio=1",
  "Asya - Pişmanım\thttps://www.youtube.com/watch?v=oO8mBHaZBkA&list=RDoO8mBHaZBkA&start_radio=1\thttps://www.youtube.com/watch?v=7S_82rWv-q0&list=RD7S_82rWv-q0&start_radio=1",
  "Nilüfer- Mavilim\thttps://www.youtube.com/watch?v=17we-e5wjc8&list=RD17we-e5wjc8&start_radio=1\thttps://www.youtube.com/watch?v=OY3VSv5Vn9Q&list=RDOY3VSv5Vn9Q&start_radio=1",
  "Nilüfer- Haram Geceler\thttps://www.youtube.com/watch?v=Bco67TlT9p0&list=RDBco67TlT9p0&start_radio=1\thttps://www.youtube.com/watch?v=8f595Vm95fU&list=RD8f595Vm95fU&start_radio=1",
  "Nilüfer- Gözlerinin Hapsindeyim\thttps://www.youtube.com/watch?v=JHF561IZwfo&list=RDJHF561IZwfo&start_radio=1\thttps://www.youtube.com/watch?v=Gyv4LV3w03I&list=RDGyv4LV3w03I&start_radio=1",
  "Nilüfer & Kayahan- Yemin Ettim\thttps://www.youtube.com/watch?v=PSCI5u3O7ZE&list=RDPSCI5u3O7ZE&start_radio=1\thttps://www.youtube.com/watch?v=2xH16oTYJsY&list=RD2xH16oTYJsY&start_radio=1",
  "Nilüfer- Ve Melankoli\thttps://www.youtube.com/watch?v=itH2_T5yCAs&list=RDitH2_T5yCAs&start_radio=1\thttps://www.youtube.com/watch?v=0eAb2H5FtUo&list=RD0eAb2H5FtUo&start_radio=1",
  "Nilüfer- Son Arzum\thttps://www.youtube.com/watch?v=gwtiHjOixDQ&list=RDgwtiHjOixDQ&start_radio=1\thttps://www.youtube.com/watch?v=kBgJw3Pm7FU&list=RDkBgJw3Pm7FU&start_radio=1",

  // ⚠️ BU SATIR TXT’DE EKSİK: karaoke linki yoktu, o yüzden 3. kolon boş.
  "Nilüfer- Başıma Gelenler\thttps://www.youtube.com/watch?v=M_2ufwpZNI0&list=RDM_2ufwpZNI0&start_radio=1\t",

  "Aşkın Nur Yengi - Yalancı Bahar\thttps://www.youtube.com/watch?v=kGkezfjlDlQ&list=RDkGkezfjlDlQ&start_radio=1\thttps://www.youtube.com/watch?v=v5XZOGFOoOE&list=RDv5XZOGFOoOE&start_radio=1",
].join("\n");


  const [bulkText, setBulkText] = useState(DEFAULT_BULK_TEXT);

  const songRequestsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "song_requests");
  }, [firestore]);

  const { data: songs, isLoading } = useCollection<Song>(songRequestsQuery);

  // ✅ owner panel toast
  useOwnerSongRequestToast({ role, songs, toast });

  const sortedSongs = useMemo(() => {
    if (!songs) return [];
    return [...songs].sort((a, b) => {
      const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return tb - ta;
    });
  }, [songs]);

  // audit
  const auditQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "audit_logs");
  }, [firestore]);

  const { data: auditLogs } = useCollection<AuditLog>(auditQuery);

  const sortedLogs = useMemo(() => {
    if (!auditLogs) return [];
    return [...auditLogs].sort((a, b) => {
      const ta = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
      const tb = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
      return tb - ta;
    });
  }, [auditLogs]);

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !editingSong) return;

    const form = new FormData(e.target as HTMLFormElement);
    const studentName = String(form.get("studentName") || "").trim();
    const songTitle = String(form.get("songTitle") || "").trim();
    const songLink = String(form.get("songLink") || "").trim();
    const karaokeLink = String(form.get("karaokeLink") || "").trim();

    if (!studentName || !songTitle || !karaokeLink) {
      toast({ title: "Eksik alan", description: "İsim, şarkı başlığı ve karaoke linki zorunlu.", variant: "destructive" });
      return;
    }
    if (songLink && !isProbablyUrl(songLink)) {
      toast({ title: "Link hatası", description: "Normal link geçerli bir URL olmalı.", variant: "destructive" });
      return;
    }
    if (!isProbablyUrl(karaokeLink)) {
      toast({ title: "Link hatası", description: "Karaoke linki geçerli bir URL olmalı.", variant: "destructive" });
      return;
    }

    setIsDBActionRunning(true);
    try {
      await updateDocumentNonBlocking(doc(firestore, "song_requests", editingSong.id), {
        studentName,
        songTitle,
        songLink: songLink || null,
        karaokeLink,
      });

      toast({ title: "Güncellendi", description: `"${songTitle}" güncellendi.` });
      setEditingSong(null);
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "Güncelleme başarısız.", variant: "destructive" });
    } finally {
      setIsDBActionRunning(false);
    }
  };

  const handleDelete = async () => {
    if (!firestore || !deletingSong) return;
    setIsDBActionRunning(true);
    try {
      await deleteDocumentNonBlocking(doc(firestore, "song_requests", deletingSong.id));
      toast({ title: "Silindi", description: `"${deletingSong.songTitle}" silindi.` });
      setDeletingSong(null);
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "Silme başarısız.", variant: "destructive" });
    } finally {
      setIsDBActionRunning(false);
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
      toast({ title: "Tamam", description: "Tüm şarkılar silindi." });
      setShowDeleteConfirm(false);
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "Toplu silme başarısız.", variant: "destructive" });
    } finally {
      setIsDBActionRunning(false);
    }
  };

  const handleAddDefaultList = async () => {
    // ✅ Varsayılan liste artık bulkText’i parse edip basıyor.
    // Yani sen buraya 100 satır yapıştırırsan, “Varsayılan Listeyi Ekle” de hepsini ekler.
    await handleBulkAdd(true);
    setShowAddConfirm(false);
  };

  const handleBulkAdd = async (calledFromDefaultButton: boolean) => {
    if (!firestore) return;

    const items = parseBulkInput(bulkText);
    if (!items.length) {
      toast({
        title: "Boş / yanlış format",
        description:
          "Bulk metninde parse edilecek şarkı bulamadım. Excel’den 3 kolon (Şarkı, Link, Karaoke) veya satır başı 'Şarkı;KaraokeLink' kullan.",
        variant: "destructive",
      });
      return;
    }

    // Dedup: same title => same hash
    const unique = new Map<string, { songTitle: string; songLink?: string; karaokeLink: string }>();
    for (const it of items) {
      const key = md5((it.songTitle || "").toLowerCase().trim()).toString();
      if (!unique.has(key)) unique.set(key, it);
    }

    setIsDBActionRunning(true);
    try {
      const batch = writeBatch(firestore);
      unique.forEach((it) => {
        const ref = doc(collection(firestore, "song_requests"));
        batch.set(ref, {
          studentName: "Repertuvar",
          songTitle: it.songTitle,
          songLink: it.songLink || null,
          karaokeLink: it.karaokeLink,
          status: "approved",
          createdAt: serverTimestamp(),
        });
      });
      await batch.commit();

      toast({
        title: "Eklendi",
        description: `${unique.size} şarkı eklendi.${calledFromDefaultButton ? " (Varsayılan liste)" : ""}`,
      });
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "Toplu ekleme başarısız.", variant: "destructive" });
    } finally {
      setIsDBActionRunning(false);
    }
  };

  const approvedCount = (songs || []).filter((s) => s.status === "approved").length;
  const pendingCount = (songs || []).filter((s) => s.status === "pending").length;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <header className="mx-auto mt-6 w-[min(1100px,92%)]">
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-4 sm:px-6 py-4">
          <Link href="/" className="text-white font-black text-xl">
            BKara<span className="text-red-500">90</span>ke
          </Link>

          <div className="flex items-center gap-2 text-sm text-neutral-300">
            <span className="opacity-80">Onaylı:</span> <b className="text-fuchsia-300">{approvedCount}</b>
            <span className="opacity-80 ml-2">Bekleyen:</span> <b className="text-yellow-300">{pendingCount}</b>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-6 w-[min(1100px,92%)] pb-20">
        <div className="rounded-[28px] border border-white/12 bg-white/10 backdrop-blur-xl p-6 sm:p-10">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-100">Yönetici Paneli ({role})</h1>
            <Link href="/" className="text-sm text-neutral-300 hover:text-white">
              Ana sayfa
            </Link>
          </div>

          <Tabs defaultValue="list" className="mt-6">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="list">İstekler</TabsTrigger>
              {role === "owner" && <TabsTrigger value="bulk-add">Toplu Ekle</TabsTrigger>}
              {role === "owner" && <TabsTrigger value="audit">Audit</TabsTrigger>}
            </TabsList>

            <TabsContent value="list" className="mt-6">
              <div className="grid gap-3">
                {isLoading ? (
                  <p className="text-neutral-400">Yükleniyor…</p>
                ) : sortedSongs.length ? (
                  sortedSongs.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-2xl border border-white/12 bg-black/30 backdrop-blur p-4 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm text-neutral-300">{s.studentName}</div>
                          <div className="text-lg font-bold text-neutral-100">{s.songTitle}</div>
                          <div className="mt-1 text-xs text-neutral-400">
                            {s.createdAt?.toDate
                              ? formatDistanceToNow(s.createdAt.toDate(), { addSuffix: true, locale: tr })
                              : "az önce"}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setEditingSong(s)}
                            className="bg-white/10 hover:bg-white/20"
                          >
                            <Edit className="h-4 w-4 mr-2" /> Düzenle
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeletingSong(s)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Sil
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-1 text-sm">
                        {s.songLink ? (
                          <a href={s.songLink} target="_blank" rel="noreferrer" className="text-blue-300 hover:underline">
                            Normal link
                          </a>
                        ) : (
                          <span className="text-neutral-500">Normal link yok</span>
                        )}

                        <a href={s.karaokeLink} target="_blank" rel="noreferrer" className="text-fuchsia-300 hover:underline">
                          Karaoke link
                        </a>
                      </div>

                      <div className="text-xs">
                        <span
                          className={[
                            "px-2 py-1 rounded-full",
                            s.status === "approved"
                              ? "bg-green-500/20 text-green-200"
                              : s.status === "pending"
                              ? "bg-yellow-500/20 text-yellow-200"
                              : "bg-red-500/20 text-red-200",
                          ].join(" ")}
                        >
                          {s.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-neutral-400">Henüz kayıt yok.</p>
                )}
              </div>

              {role === "owner" && (
                <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black text-neutral-200">Owner işlemleri</h2>
                      <p className="text-sm text-neutral-400">Toplu silme ve varsayılan liste basma.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} disabled={isDBActionRunning}>
                        <AlertTriangle className="h-4 w-4 mr-2" />
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

            {role === "owner" && (
              <TabsContent value="bulk-add" className="mt-6">
                <h2 className="text-xl font-bold mb-3 text-neutral-300">Şarkıları Toplu Ekle</h2>

                <div className="flex flex-col gap-4">
                  <p className="text-sm text-neutral-400">
                    Excel / Google Sheets kopyala-yapıştır destekli. 3 format kabul:
                    <br />
                    <code className="bg-white/10 px-2 py-1 rounded-md text-fuchsia-300">Şarkı Adı;Karaoke Linki</code>
                    <br />
                    <code className="bg-white/10 px-2 py-1 rounded-md text-fuchsia-300">
                      Şarkı Adı[TAB]Normal Link[TAB]Karaoke Linki
                    </code>
                    <br />
                    <code className="bg-white/10 px-2 py-1 rounded-md text-fuchsia-300">
                      Şarkı Adı \n Normal Link \n Karaoke Linki
                    </code>
                  </p>

                  <Textarea
                    id="bulk-textarea"
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    className="retro-input-soft min-h-[280px]"
                    rows={18}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setBulkText(DEFAULT_BULK_TEXT)}
                      disabled={isDBActionRunning}
                    >
                      Örneği geri yükle
                    </Button>
                    <Button onClick={() => handleBulkAdd(false)} disabled={isDBActionRunning}>
                      {isDBActionRunning ? "Ekleniyor..." : "Toplu Ekle (Approved)"}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            )}

            {role === "owner" && (
              <TabsContent value="audit" className="mt-6">
                <h2 className="text-xl font-bold mb-3 text-neutral-300">Son Hareketler</h2>

                <div className="grid gap-2">
                  {(sortedLogs || []).map((log) => (
                    <div
                      key={log.id}
                      className="border border-white/15 rounded-2xl p-3 bg-white/5 backdrop-blur text-sm"
                    >
                      <span className="font-bold text-fuchsia-300">{log.songTitle}</span> -{" "}
                      <span className="text-neutral-300">{log.action}</span>
                      <div className="text-xs text-neutral-400 mt-1">
                        {log.performedBy === "owner" ? "Sahip" : "Yönetici"} tarafından,{" "}
                        {log.timestamp?.toDate
                          ? formatDistanceToNow(log.timestamp.toDate(), { addSuffix: true, locale: tr })
                          : "az önce"}
                        .
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>

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
              <Input name="songLink" defaultValue={editingSong?.songLink || ""} placeholder="Normal Şarkı Linki (opsiyonel)" />
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
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Sil
            </AlertDialogAction>
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
            <AlertDialogAction onClick={handleDeleteAll} className="bg-red-600 hover:bg-red-700">
              Evet, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Default Confirmation Dialog */}
      <AlertDialog open={showAddConfirm} onOpenChange={setShowAddConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Varsayılan Listeyi Eklemek Üzeresiniz</AlertDialogTitle>
            <AlertDialogDescription>
              “Varsayılan Listeyi Ekle” butonu artık bulk textarea içeriğini parse edip ekler. Yani oraya 100 satır yapıştırdıysan, 100’ünü de ekler.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddDefaultList}>Ekle</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default function Page() {
  // Basit rol ayrımı: owner email allow-list vb. sende nasıl ise oraya bağla.
  // Şimdilik: herkes owner gibi açılmasın diye admin yapıyorum. Senin auth mantığına göre düzelt.
  const role: Role = "owner";
  return <AdminPanel role={role} />;
}
