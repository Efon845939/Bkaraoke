"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signInAnonymously } from "firebase/auth";
import md5 from "crypto-js/md5";

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

import VhsOverlay from "@/components/VHSStage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldAlert, Pencil, Trash2, Heart, Music, MicVocal, Save, UploadCloud } from "lucide-react";
import { formatDistance } from "date-fns";
import { tr } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// --- TİP TANIMLAMALARI ---

type Role = "owner" | "admin";
type Category = "90lar" | "sevgililer";

type Song = {
  id: string;
  studentName: string;
  songTitle: string;
  songLink?: string;
  karaokeLink: string;
  status: "pending" | "approved" | "rejected";
  category?: Category; // Şarkının hangi listeye ait olduğu
  createdAt?: any;
  studentId?: string;
};

type AuditLog = {
  id: string;
  action: string;
  songTitle: string;
  performedBy: Role;
  timestamp: any;
};

// --- YARDIMCI FONKSİYONLAR ---

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

function buildBulkText(list: readonly string[]) {
  return list.map((line) => {
    const parts = line.split("\t").map((p) => p.trim());
    const title = parts[0] || "";
    const normal = parts[1] || "";
    const karaoke = parts[2] || "";
    return `${title};${normal};${karaoke}`;
  }).join("\n");
}

// --- SABİT LİSTELER (KOD UZUNLUĞU İÇİN VE YEDEK OLARAK BURADA TUTUYORUZ) ---

const DEFAULT_90S_TEXT = [
  "REM-Losing My Religion\thttps://www.youtube.com/watch?v=Efa6BAWPm9o\thttps://www.youtube.com/watch?v=gCrqBZlxSyA",
  "Bulutsuzluk Özlemi-Sözlerimi Geri Alamam\thttps://www.youtube.com/watch?v=RMu2HUTGe2c\thttps://www.youtube.com/watch?v=jHULD4aZnS0",
  "Şebnem Ferah-Sil Baştan\thttps://www.youtube.com/watch?v=yjGigzkkXMM\thttps://www.youtube.com/watch?v=MGKQpfWrBx0&list=RDMGKQpfWrBx0&start_radio=1",
  "Gülşen-Be Adam\thttps://www.youtube.com/watch?v=liaMcRqwOKs\thttps://www.youtube.com/watch?v=AyXlebMMAWE&list=RDAyMMAWE&start_radio=1",
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
  "Nilüfer- Başıma Gelenler\thttps://www.youtube.com/watch?v=M_2ufwpZNI0&list=RDM_2ufwpZNI0&start_radio=1\t",
  "Aşkın Nur Yengi - Yalancı Bahar\thttps://www.youtube.com/watch?v=kGkezfjlDlQ&list=RDkGkezfjlDlQ&start_radio=1\thttps://www.youtube.com/watch?v=v5XZOGFOoOE&list=RDv5XZOGFOoOE&start_radio=1"
] as const;

const VALENTINES_BULK_TEXT = [
  "Ajda Pekkan - Haykıracak Nefesim\thttps://www.youtube.com/watch?v=wLK_5CAxKSU&list=RDwLK_5CAxKSU&start_radio=1\thttps://www.youtube.com/watch?v=wLK_5CAxKSU&list=RDwLK_5CAxKSU&start_radio=1",
  "Ajda Pekkan - O Benim Dünyam\thttps://www.youtube.com/watch?v=tGNyZizCM9Q&list=RDtGNyZizCM9Q&start_radio=1\thttps://www.youtube.com/watch?v=tGNyZizCM9Q&list=RDtGNyZizCM9Q&start_radio=1",
  "Aydilge - Hayat Şaşırtır\thttps://www.youtube.com/watch?v=guaFAgYSHGw&list=RDguaFAgYSHGw&start_radio=1\thttps://www.youtube.com/watch?v=guaFAgYSHGw&list=RDguaFAgYSHGw&start_radio=1",
  "Barış Manço - Kara Sevda\thttps://www.youtube.com/watch?v=CNESvV5dkR0&list=RDCNESvV5dkR0&start_radio=1\thttps://www.youtube.com/watch?v=CNESvV5dkR0&list=RDCNESvV5dkR0&start_radio=1",
  "Bayhan - Müjgan\thttps://www.youtube.com/watch?v=1Bv2eNPw800\thttps://www.youtube.com/watch?v=1Bv2eNPw800",
  "Cem Adrian & Hande Mehan - Sen Benim Şarkılarımsın\thttps://www.youtube.com/watch?v=ej3uxV8UGNs&list=RDej3uxV8UGNs&start_radio=1\thttps://www.youtube.com/watch?v=ej3uxV8UGNs&list=RDej3uxV8UGNs&start_radio=1",
  "Delisin Delisin - Delisin Delisin\thttps://www.youtube.com/watch?v=0k1fPhPc5_Y&list=RD0k1fPhPc5_Y&start_radio=1\thttps://www.youtube.com/watch?v=0k1fPhPc5_Y&list=RD0k1fPhPc5_Y&start_radio=1",
  "Duman - Senden Daha Güzel\thttps://www.youtube.com/watch?v=29zZEqlC8do&list=RD29zZEqlC8do&start_radio=1\thttps://www.youtube.com/watch?v=29zZEqlC8do&list=RD29zZEqlC8do&start_radio=1",
  "EDA BABA - Her Şey Seninle Güzel\thttps://www.youtube.com/watch?v=Wb5BbhqOR_M&list=RDWb5BbhqOR_M&start_radio=1\thttps://www.youtube.com/watch?v=Wb5BbhqOR_M&list=RDWb5BbhqOR_M&start_radio=1",
  "Emre Aydın feat. Model - Bir Pazar Kahvaltısı\thttps://www.youtube.com/watch?v=TWg45aMljXI&list=RDTWg45aMljXI&start_radio=1\thttps://www.youtube.com/watch?v=TWg45aMljXI&list=RDTWg45aMljXI&start_radio=1",
  "Eric Clapton - Layla\thttps://www.youtube.com/watch?v=KQdyx9as_qY&list=RDKQdyx9as_qY&start_radio=1\thttps://www.youtube.com/watch?v=KQdyx9as_qY&list=RDKQdyx9as_qY&start_radio=1",
  "Erol Evgin - Sevdan Olmasa\thttps://www.youtube.com/watch?v=aNbr6YDYFrY&list=RDaNbr6YDYFrY&start_radio=1\thttps://www.youtube.com/watch?v=aNbr6YDYFrY&list=RDaNbr6YDYFrY&start_radio=1",
  "Ezhel - Felaket (Zeynep Bastık ile)\thttps://www.youtube.com/watch?v=QowuXJmz1pw&list=RDQowuXJmz1pw&start_radio=1\thttps://www.youtube.com/watch?v=QowuXJmz1pw&list=RDQowuXJmz1pw&start_radio=1",
  "Ferdi Tayfur / Zakkum - Hatıran Yeter\thttps://www.youtube.com/watch?v=Oz5zO4MNCUM\thttps://www.youtube.com/watch?v=Oz5zO4MNCUM",
  "Feridun Düzağaç - Alev Alev\thttps://www.youtube.com/watch?v=gz5GNmO9prQ&list=RDgz5GNmO9prQ&start_radio=1\thttps://www.youtube.com/watch?v=gz5GNmO9prQ&list=RDgz5GNmO9prQ&start_radio=1",
  "Frank Sinatra - Fly Me To The Moon\thttps://www.youtube.com/watch?v=VvjWl7lvrnk&list=RDVvjWl7lvrnk&start_radio=1\thttps://www.youtube.com/watch?v=VvjWl7lvrnk&list=RDVvjWl7lvrnk&start_radio=1",
  "George Michael - Careless Whisper\thttps://www.youtube.com/watch?v=1TIeDbnzp9M&list=RD1TIeDbnzp9M&start_radio=1\thttps://www.youtube.com/watch?v=1TIeDbnzp9M&list=RD1TIeDbnzp9M&start_radio=1",
  "Göksel - Uzaktan\thttps://www.youtube.com/watch?v=rjLuGtlPjG4&list=RDrjLuGtlPjG4&start_radio=1\thttps://www.youtube.com/watch?v=rjLuGtlPjG4&list=RDrjLuGtlPjG4&start_radio=1",
  "Gökhan Türkmen - Aşk\thttps://www.youtube.com/watch?v=ohTjmCwM3bs\thttps://www.youtube.com/watch?v=ohTjmCwM3bs",
  "Grover Washington Jr ft. Bill Withers - Just The Two Of Us\thttps://www.youtube.com/watch?v=yIyW2lcapHs&list=RDyIyW2lcapHs&start_radio=1\thttps://www.youtube.com/watch?v=yIyW2lcapHs&list=RDyIyW2lcapHs&start_radio=1",
  "Gripin - Aşk Nereden Nereye\thttps://www.youtube.com/watch?v=egMNzG0-etE&list=RDegMNzG0-etE&start_radio=1\thttps://www.youtube.com/watch?v=egMNzG0-etE&list=RDegMNzG0-etE&start_radio=1",
  "Gülşen - Sarışınım\thttps://www.youtube.com/watch?v=CRsjpwIuOmo&list=RDCRsjpwIuOmo&start_radio=1\thttps://www.youtube.com/watch?v=CRsjpwIuOmo&list=RDCRsjpwIuOmo&start_radio=1",
  "Gülay - Cesaretin Var mı Aşka\thttps://www.youtube.com/watch?v=vCTDUNNDkgI&list=RDvCTDUNNDkgI&start_radio=1\thttps://www.youtube.com/watch?v=vCTDUNNDkgI&list=RDvCTDUNNDkgI&start_radio=1",
  "Hadise - Düm Tek Tek\thttps://www.youtube.com/watch?v=T2py3gmU_LE&list=RDT2py3gmU_LE&start_radio=1\thttps://www.youtube.com/watch?v=T2py3gmU_LE&list=RDT2py3gmU_LE&start_radio=1",
  "İbrahim Tatlıses / Kalben - Haydi Söyle\thttps://www.youtube.com/watch?v=EzC5uhEtsPE&list=RDEzC5uhEtsPE&start_radio=1\thttps://www.youtube.com/watch?v=EzC5uhEtsPE&list=RDEzC5uhEtsPE&start_radio=1",
  "İrem Derici - Kalbimin Tek Sahibine\thttps://www.youtube.com/watch?v=vbF3_W_E2CU\thttps://www.youtube.com/watch?v=vbF3_W_E2CU",
  "Kenan Doğulu - Tutamıyorum Zamanı\thttps://www.youtube.com/watch?v=pfk6loZryY0&list=RDpfk6loZryY0&start_radio=1\thttps://www.youtube.com/watch?v=pfk6loZryY0&list=RDpfk6loZryY0&start_radio=1",
  "Mabel Matiz / Yıldız Tilbe - Aşk Yok Olmaktır\thttps://www.youtube.com/watch?v=fctQe8sb1e0\thttps://www.youtube.com/watch?v=fctQe8sb1e0",
  "Mahsun Kırmızıgül - Dinle\thttps://www.youtube.com/watch?v=rZvRAm32nFY&list=RDrZvRAm32nFY&start_radio=1\thttps://www.youtube.com/watch?v=rZvRAm32nFY&list=RDrZvRAm32nFY&start_radio=1",
  "Mazhar Alanson - Ah Bu Ben\thttps://www.youtube.com/watch?v=GvL91Tgrlew&list=RDGvL91Tgrlew&start_radio=1\thttps://www.youtube.com/watch?v=GvL91Tgrlew&list=RDGvL91Tgrlew&start_radio=1",
  "Mazhar Alanson - Yandım Yandım\thttps://www.youtube.com/watch?v=hN25wWblGvU&list=RDhN25wWblGvU&start_radio=1\thttps://www.youtube.com/watch?v=hN25wWblGvU&list=RDhN25wWblGvU&start_radio=1",
  "Model - Mey\thttps://www.youtube.com/watch?v=157dV_w2n7k&list=RD157dV_w2n7k&start_radio=1\thttps://www.youtube.com/watch?v=157dV_w2n7k&list=RD157dV_w2n7k&start_radio=1",
  "mor ve ötesi - Aşk İçinde\thttps://www.youtube.com/watch?v=y5uGxKFyYmk&list=RDy5uGxKFyYmk&start_radio=1\thttps://www.youtube.com/watch?v=y5uGxKFyYmk&list=RDy5uGxKFyYmk&start_radio=1",
  "Nil Karaibrahimgil - Kanatlarım Var Ruhumda\thttps://www.youtube.com/watch?v=UgW2tEip_98&list=RDUgW2tEip_98&start_radio=1\thttps://www.youtube.com/watch?v=UgW2tEip_98&list=RDUgW2tEip_98&start_radio=1",
  "Rafet El Roman - Seni Seviyorum\thttps://www.youtube.com/watch?v=tcYTDd-r1LY&list=RDtcYTDd-r1LY&start_radio=1\thttps://www.youtube.com/watch?v=tcYTDd-r1LY&list=RDtcYTDd-r1LY&start_radio=1",
  "Sezen Aksu - Ne Kavgam Bitti Ne Sevdam\thttps://www.youtube.com/watch?v=VrFDggkkzF4&list=RDVrFDggkkzF4&start_radio=1\thttps://www.youtube.com/watch?v=VrFDggkkzF4&list=RDVrFDggkkzF4&start_radio=1",
  "Sertab Erener - Aşk\thttps://www.youtube.com/watch?v=1UXYcgYqsCQ&list=RD1UXYcgYqsCQ&start_radio=1\thttps://www.youtube.com/watch?v=1UXYcgYqsCQ&list=RD1UXYcgYqsCQ&start_radio=1",
  "Sertab Erener - Rengarenk\thttps://www.youtube.com/watch?v=-B7zwpMNLIY&list=RD-B7zwpMNLIY&start_radio=1\thttps://www.youtube.com/watch?v=-B7zwpMNLIY&list=RD-B7zwpMNLIY&start_radio=1",
  "Tarkan - Adımı Kalbine Yaz\thttps://www.youtube.com/watch?v=DCQKA4sI3qU&list=RDDCQKA4sI3qU&start_radio=1\thttps://www.youtube.com/watch?v=DCQKA4sI3qU&list=RDDCQKA4sI3qU&start_radio=1",
  "The Cure - Love Song\thttps://www.youtube.com/watch?v=Fok2RrUtDgQ&list=RDFok2RrUtDgQ&start_radio=1\thttps://www.youtube.com/watch?v=Fok2RrUtDgQ&list=RDFok2RrUtDgQ&start_radio=1",
  "Ufuk Beydemir - Ay Tenli Kadın\thttps://www.youtube.com/watch?v=83eNSojydCE\thttps://www.youtube.com/watch?v=83eNSojydCE",
  "Ufuk Yıldırım - Yaradana Yalvartma\thttps://www.youtube.com/watch?v=cANdjiz2srg\thttps://www.youtube.com/watch?v=cANdjiz2srg",
  "Ümit Sayın - Gül Beyaz Gül (Zeynep Bastık ile)\thttps://www.youtube.com/watch?v=ugKvd82ds34&list=RDugKvd82ds34&start_radio=1\thttps://www.youtube.com/watch?v=ugKvd82ds34&list=RDugKvd82ds34&start_radio=1",
  "Volkan Konak - Yarim Yarim\thttps://www.youtube.com/watch?v=1Esr6E3EBdc\thttps://www.youtube.com/watch?v=1Esr6E3EBdc",
  "Yalın - Her Şey Sensin\thttps://www.youtube.com/watch?v=GAw5PWHnZiM&list=RDGAw5PWHnZiM&start_radio=1\thttps://www.youtube.com/watch?v=GAw5PWHnZiM&list=RDGAw5PWHnZiM&start_radio=1",
  "Yalın - Küçücüğüm\thttps://www.youtube.com/watch?v=k0yvk8ujPlo&list=RDk0yvk8ujPlo&start_radio=1\thttps://www.youtube.com/watch?v=k0yvk8ujPlo&list=RDk0yvk8ujPlo&start_radio=1",
  "Yalın - Zalim\thttps://www.youtube.com/watch?v=rFTA9DDbTSU&list=RDrFTA9DDbTSU&start_radio=1\thttps://www.youtube.com/watch?v=rFTA9DDbTSU&list=RDrFTA9DDbTSU&start_radio=1",
  "Yıldız Tilbe - Ummadığım Anda\thttps://www.youtube.com/watch?v=N0TsIxik6rY\thttps://www.youtube.com/watch?v=N0TsIxik6rY",
  "Zeynep Bastık & Rıza Tamer - Benden Sonra\thttps://www.youtube.com/watch?v=Fm-myFuG1LI&list=RDFm-myFuG1LI&start_radio=1\thttps://www.youtube.com/watch?v=Fm-myFuG1LI&list=RDFm-myFuG1LI&start_radio=1",
  "Beyaz Kelebekler - Sen Gidince\thttps://www.youtube.com/watch?v=3XaYVLXoKrc&list=RD3XaYVLXoKrc&start_radio=1\thttps://www.youtube.com/watch?v=3XaYVLXoKrc&list=RD3XaYVLXoKrc&start_radio=1"
] as const;

function AccessPanel({
  onLogin,
  error,
}: {
  onLogin: (pw: string) => void;
  error: string | null;
}) {
  const [pw, setPw] = useState("");
  return (
    <div className="min-h-screen grid place-items-center relative bg-black selection:bg-pink-500/30">
      <div className="mx-auto w-[min(400px,90%)] relative z-10">
        <h1 className="text-3xl font-black mb-6 text-center text-pink-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]">
            Erişim Paneli
        </h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onLogin(pw);
          }}
          className="flex flex-col gap-4"
        >
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Parola"
            className="retro-input-soft border-pink-500/30 focus:border-pink-500 text-center"
          />
          {error && <p className="text-red-400 text-sm text-center font-bold">{error}</p>}
          <button type="submit" className="retro-btn-soft bg-pink-600 hover:bg-pink-500 text-white border-none">
            Giriş Yap
          </button>
          <Link
            href="/"
            className="text-center text-sm text-neutral-500 hover:text-pink-400 hover:underline mt-2 transition-colors"
          >
            Lobiye Dön
          </Link>
        </form>
      </div>

      <VhsOverlay intensity={0.08} sfxVolume={0.35} />
    </div>
  );
}

// --- ANA COMPONENT ---

export default function AdminPage() {
  const { firestore, auth } = useFirebase();

  const [role, setRole] = useState<Role | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  // İKİ AYRI STATE: Manual Giriş İçin
  const [bulkText90s, setBulkText90s] = useState("");
  const [bulkTextLove, setBulkTextLove] = useState("");
  
  const [busy, setBusy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Varsayılan listeyi yükleme modalı
  const [showDefaultConfirm, setShowDefaultConfirm] = useState<{type: Category | null, open: boolean}>({ type: null, open: false });

  const [editTarget, setEditTarget] = useState<Song | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Song | null>(null);

  useEffect(() => {
    if (!auth) return;
    if (auth.currentUser) return;
    signInAnonymously(auth).catch((e) => {
      console.error("Anonymous sign-in failed (admin):", e);
    });
  }, [auth]);

  const songRequestsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "song_requests");
  }, [firestore]);

  const auditLogsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "audit_logs");
  }, [firestore]);

  const { data: songs, isLoading } = useCollection<Song>(songRequestsQuery);
  const { data: logs, isLoading: logsLoading } = useCollection<AuditLog>(auditLogsQuery);

  const canModerate = role === "owner" || role === "admin";
  const canDangerZone = role === "owner";

  const sortedSongs = useMemo(() => {
    if (!songs) return [];
    return [...songs].sort((a, b) => {
      const at = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const bt = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return bt.getTime() - at.getTime();
    });
  }, [songs]);

  const sortedLogs = useMemo(() => {
    if (!logs) return [];
    return [...logs].sort((a, b) => {
      const at = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(0);
      const bt = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(0);
      return bt.getTime() - at.getTime();
    });
  }, [logs]);

  // FİLTRELER
  const pending = sortedSongs.filter((s) => s.status === "pending");
  const approved90s = sortedSongs.filter((s) => s.status === "approved" && (!s.category || s.category === "90lar"));
  const approvedLove = sortedSongs.filter((s) => s.status === "approved" && s.category === "sevgililer");
  const rejected = sortedSongs.filter((s) => s.status === "rejected");

  async function addAudit(action: string, songTitle: string) {
    if (!firestore || !role) return;
    try {
      await addDoc(collection(firestore, "audit_logs"), {
        action,
        songTitle,
        performedBy: role,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.error("Audit log failed:", e);
    }
  }

  // --- GELİŞMİŞ TOPLU EKLEME FONKSİYONU ---
  async function bulkAdd(listSource: "manual_90s" | "manual_love" | "default_90s" | "default_love") {
    if (!firestore || !auth?.currentUser) return;
    setBusy(true);

    let textToParse = "";
    let categoryToSet: Category = "90lar";

    if (listSource === "manual_90s") {
      textToParse = bulkText90s;
      categoryToSet = "90lar";
    } else if (listSource === "manual_love") {
      textToParse = bulkTextLove;
      categoryToSet = "sevgililer";
    } else if (listSource === "default_90s") {
      textToParse = buildBulkText(DEFAULT_90S_TEXT);
      categoryToSet = "90lar";
    } else if (listSource === "default_love") {
      textToParse = buildBulkText(VALENTINES_BULK_TEXT);
      categoryToSet = "sevgililer";
    }

    const lines = normalizeLine(textToParse).split("\n").map(normalizeLine).filter(Boolean);
    if (!lines.length) {
      setBusy(false);
      alert("Eklenecek liste boş.");
      return;
    }

    const batchSongs = writeBatch(firestore);
    const batchLogs = writeBatch(firestore);

    let ok = 0;
    let bad = 0;

    for (const line of lines) {
      const parts = line.split(";").map((p) => p.trim());
      if (parts.length !== 3) {
        bad++;
        continue;
      }

      const [title, normalLink, karaoke] = parts;
      
      if (!title || !karaoke) {
        bad++;
        continue;
      }

      const songRef = doc(collection(firestore, "song_requests"));
      batchSongs.set(songRef, {
        studentName: categoryToSet === "sevgililer" ? "Sistem (❤️ Liste)" : "Sistem (90'lar)",
        songTitle: title,
        songLink: normalLink,
        karaokeLink: karaoke,
        status: "approved",
        category: categoryToSet, // KATEGORİ ATAMASI
        createdAt: serverTimestamp(),
        studentId: auth.currentUser.uid,
      });

      const logRef = doc(collection(firestore, "audit_logs"));
      batchLogs.set(logRef, {
        action: `Toplu eklendi [${categoryToSet}]`,
        songTitle: title,
        performedBy: role ?? "admin",
        timestamp: serverTimestamp(),
      });

      ok++;
    }

    try {
      await batchSongs.commit();
      await batchLogs.commit();
      alert(`[${categoryToSet.toUpperCase()}] Listesine ${ok} şarkı eklendi. Hatalı satır: ${bad}`);
      if (listSource === "manual_90s") setBulkText90s("");
      if (listSource === "manual_love") setBulkTextLove("");
    } catch (e) {
      console.error("Bulk add failed:", e);
      alert("Toplu ekleme başarısız.");
    } finally {
      setBusy(false);
      setShowDefaultConfirm({ type: null, open: false });
    }
  }

  async function deleteAll() {
    if (!firestore || !auth?.currentUser) return;
    setBusy(true);

    try {
      const snap = await getDocs(collection(firestore, "song_requests"));
      const batch = writeBatch(firestore);
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      await addAudit("Tüm liste silindi", "ALL");
      alert("Tertemiz oldu.");
    } catch (e) {
      console.error("Delete all failed:", e);
      alert("Silinemedi.");
    } finally {
      setBusy(false);
      setShowDeleteConfirm(false);
    }
  }

  function setStatus(song: Song, status: Song["status"]) {
    if (!firestore) return;
    updateDocumentNonBlocking(doc(firestore, "song_requests", song.id), { status });
    addAudit(`Durum "${status}" olarak değiştirildi`, song.songTitle);
  }

  function doDelete(song: Song) {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, "song_requests", song.id));
    addAudit("Silindi", song.songTitle);
  }

  function handleLogin(pw: string) {
    const hashed = md5(pw).toString();
    if (hashed === "0a8a46f5c4a84c9f35cf8f8a231d1936") {
      setRole("owner");
      setLoginError(null);
      return;
    }
    if (hashed === "bfbb9631e2d34e8875654a7402a19f1b") {
      setRole("admin");
      setLoginError(null);
      return;
    }
    setLoginError("Yanlış parola.");
  }

  if (!role) {
    return <AccessPanel onLogin={handleLogin} error={loginError} />;
  }

  const loading = isLoading || (role === "owner" && logsLoading);

  return (
    <div className="min-h-screen p-6 relative bg-black selection:bg-pink-500/30 text-white font-sans">
      <div className="mx-auto w-[min(1200px,96%)] relative z-10">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                {role === "owner" ? "SAHİP KONTROL MERKEZİ" : "YÖNETİCİ PANELİ"}
            </h1>
            <p className="text-neutral-400 text-sm mt-1">Sistemin kalbi burası.</p>
          </div>
          <Link href="/" className="rounded-xl px-5 py-3 border border-white/20 hover:bg-white/10 transition-all font-semibold hover:border-white/40">
            Lobiye Dön
          </Link>
        </div>

        {loading && <div className="text-pink-400 animate-pulse text-xl font-bold p-10 text-center">Veriler veritabanından çekiliyor...</div>}

        {!loading && (
          <Tabs defaultValue="requests" className="space-y-6">
            <TabsList className="bg-neutral-900/80 border border-white/10 p-1 rounded-xl flex flex-wrap h-auto gap-2">
              <TabsTrigger value="requests" className="data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-200 py-2.5">
                  Bekleyenler ({pending.length})
              </TabsTrigger>
              <TabsTrigger value="approved_love" className="data-[state=active]:bg-pink-600 data-[state=active]:text-white py-2.5">
                  ❤️ Aşk Şarkıları ({approvedLove.length})
              </TabsTrigger>
              <TabsTrigger value="approved_90s" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white py-2.5">
                  📼 90'lar ({approved90s.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-300 py-2.5">
                  Reddedilenler ({rejected.length})
              </TabsTrigger>
              {canDangerZone && (
                <TabsTrigger value="bulk-add" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white py-2.5 border border-blue-500/30 ml-auto">
                    🚀 Şarkı Ekleme Üssü
                </TabsTrigger>
              )}
              {canDangerZone && (
                <TabsTrigger value="audit" className="data-[state=active]:bg-neutral-700 py-2.5">
                    Denetim
                </TabsTrigger>
              )}
            </TabsList>

            {/* --- BEKLEYENLER --- */}
            <TabsContent value="requests" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-yellow-200">Onay Bekleyen İstekler</h2>
                <span className="text-sm text-neutral-500">Kullanıcıların gönderdiği istekler burada görünür.</span>
              </div>
              <div className="grid gap-3">
                {pending.length === 0 ? (
                    <div className="p-10 border border-dashed border-white/10 rounded-xl text-center text-neutral-500">
                        Şu an bekleyen istek yok. Herkes şarkı söylüyor olmalı!
                    </div>
                ) : (
                    pending.map((s) => (
                        <div key={s.id} className="group border border-yellow-500/30 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center bg-yellow-500/5 backdrop-blur hover:bg-yellow-500/10 transition-all gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Bekliyor</span>
                                    <span className="text-xs text-neutral-400">• {s.studentName}</span>
                                </div>
                                <strong className="text-xl text-yellow-100 block">{s.songTitle}</strong>
                                <div className="text-xs text-neutral-400 mt-2 space-y-1 font-mono">
                                    <a href={s.songLink || "#"} target="_blank" className="block text-sky-400 hover:underline truncate opacity-70 hover:opacity-100">Orijinal: {s.songLink}</a>
                                    <a href={s.karaokeLink} target="_blank" className="block text-pink-400 hover:underline truncate opacity-70 hover:opacity-100">Karaoke: {s.karaokeLink}</a>
                                </div>
                            </div>

                            {canModerate && (
                                <div className="flex gap-2 items-center w-full md:w-auto justify-end border-t md:border-t-0 border-white/10 pt-3 md:pt-0">
                                    <button onClick={() => setStatus(s, "approved")} className="rounded-lg px-4 py-2 bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30 font-bold transition-all">Onayla</button>
                                    <button onClick={() => setStatus(s, "rejected")} className="rounded-lg px-4 py-2 bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 font-bold transition-all">Reddet</button>
                                    <div className="w-px h-8 bg-white/10 mx-2 hidden md:block"></div>
                                    <Button onClick={() => setEditTarget(s)} size="icon" variant="ghost" className="h-9 w-9 hover:bg-white/10"><Pencil className="h-4 w-4" /></Button>
                                    <Button onClick={() => setDeleteTarget(s)} size="icon" variant="ghost" className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-900/20"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            )}
                        </div>
                    ))
                )}
              </div>
            </TabsContent>

            {/* --- SEVGİLİLER GÜNÜ ONAYLI --- */}
            <TabsContent value="approved_love" className="space-y-4">
                <div className="flex items-center gap-3 mb-4 p-4 rounded-2xl bg-gradient-to-r from-pink-900/40 to-transparent border border-pink-500/20">
                    <div className="p-3 bg-pink-500 rounded-full text-white shadow-lg shadow-pink-500/50">
                        <Heart className="size-6 fill-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-pink-100">Sevgililer Günü Listesi</h2>
                        <p className="text-pink-300/70 text-sm">Ana sayfada "Aşk Listesi" butonuna basınca çıkanlar.</p>
                    </div>
                </div>

                <div className="grid gap-2">
                    {approvedLove.map((s) => (
                        <div key={s.id} className="border border-pink-500/20 rounded-xl p-3 flex flex-col sm:flex-row justify-between items-center bg-pink-500/5 hover:bg-pink-500/10 transition-colors gap-3">
                            <div className="flex-1 w-full">
                                <strong className="text-pink-200 text-lg">{s.songTitle}</strong>
                                <div className="text-xs text-neutral-400 mt-1 flex gap-2 items-center">
                                    <span className="bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded text-[10px]">AŞK</span>
                                    <span>{s.studentName}</span>
                                </div>
                            </div>
                             {canModerate && (
                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                    <button onClick={() => setStatus(s, "pending")} className="rounded-lg px-3 py-1.5 bg-yellow-500/10 text-yellow-300 text-xs border border-yellow-500/20 hover:bg-yellow-500/20">Beklemeye Al</button>
                                    <Button onClick={() => setEditTarget(s)} size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10"><Pencil className="h-4 w-4" /></Button>
                                    <Button onClick={() => setDeleteTarget(s)} size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </TabsContent>

            {/* --- 90LAR ONAYLI --- */}
            <TabsContent value="approved_90s" className="space-y-4">
                 <div className="flex items-center gap-3 mb-4 p-4 rounded-2xl bg-gradient-to-r from-purple-900/40 to-transparent border border-purple-500/20">
                    <div className="p-3 bg-purple-500 rounded-full text-white shadow-lg shadow-purple-500/50">
                        <Music className="size-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-purple-100">90'lar Pop Listesi</h2>
                        <p className="text-purple-300/70 text-sm">Eskimeyen klasikler burada duruyor.</p>
                    </div>
                </div>

                <div className="grid gap-2">
                    {approved90s.map((s) => (
                        <div key={s.id} className="border border-purple-500/20 rounded-xl p-3 flex flex-col sm:flex-row justify-between items-center bg-purple-500/5 hover:bg-purple-500/10 transition-colors gap-3">
                            <div className="flex-1 w-full">
                                <strong className="text-purple-200 text-lg">{s.songTitle}</strong>
                                <div className="text-xs text-neutral-400 mt-1 flex gap-2 items-center">
                                    <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-[10px]">90LAR</span>
                                    <span>{s.studentName}</span>
                                </div>
                            </div>
                             {canModerate && (
                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                    <button onClick={() => setStatus(s, "pending")} className="rounded-lg px-3 py-1.5 bg-yellow-500/10 text-yellow-300 text-xs border border-yellow-500/20 hover:bg-yellow-500/20">Beklemeye Al</button>
                                    <Button onClick={() => setEditTarget(s)} size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10"><Pencil className="h-4 w-4" /></Button>
                                    <Button onClick={() => setDeleteTarget(s)} size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </TabsContent>

            <TabsContent value="rejected">
                <div className="grid gap-2 opacity-60">
                     {rejected.map((s) => (
                        <div key={s.id} className="border border-white/5 rounded-xl p-3 flex justify-between items-center bg-black/40 grayscale hover:grayscale-0 transition-all">
                            <div><strong>{s.studentName}</strong> — {s.songTitle}</div>
                            {canModerate && (
                                <div className="flex gap-2">
                                     <button onClick={() => setStatus(s, "pending")} className="text-xs underline">Geri Al</button>
                                     <Button onClick={() => setDeleteTarget(s)} size="icon" variant="ghost" className="h-6 w-6"><Trash2 className="h-3 w-3" /></Button>
                                </div>
                            )}
                        </div>
                     ))}
                </div>
            </TabsContent>

            {/* --- TOPLU EKLEME MERKEZİ (ARTIK AYRI AYRI) --- */}
            {canDangerZone && (
              <TabsContent value="bulk-add" className="space-y-8 mt-6">
                
                {/* BÖLÜM 1: SEVGİLİLER GÜNÜ */}
                <div className="border border-pink-500/30 rounded-3xl overflow-hidden bg-black/20">
                    <div className="bg-pink-900/20 p-4 border-b border-pink-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Heart className="text-pink-500 fill-pink-500 animate-pulse" />
                            <h3 className="text-xl font-bold text-pink-100">SEVGİLİLER GÜNÜ LİSTESİ YÖNETİMİ</h3>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-pink-500/50 text-pink-300 hover:bg-pink-500/20"
                            onClick={() => setShowDefaultConfirm({ type: "sevgililer", open: true })}
                        >
                            <UploadCloud className="mr-2 h-4 w-4" /> Varsayılan 50 Şarkıyı Yükle
                        </Button>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-neutral-400 mb-2">
                            Aşağıdaki kutuya ekleyeceğiniz şarkılar direkt olarak <strong>Sevgililer Günü</strong> listesine gider.
                        </p>
                        <div className="bg-black/30 p-2 rounded-lg mb-2 font-mono text-xs text-pink-300/70 border border-white/5">
                            Format: Şarkı Adı;NormalLink;KaraokeLink
                        </div>
                        <Textarea
                            value={bulkTextLove}
                            onChange={(e) => setBulkTextLove(e.target.value)}
                            placeholder={`Ajda Pekkan - O Benim Dünyam;https://...;https://...\nKenan Doğulu - Tencere Kapak;https://...;https://...`}
                            className="retro-input-soft min-h-[150px] font-mono text-xs border-pink-500/20 focus:border-pink-500"
                        />
                        <div className="flex justify-end mt-4">
                            <Button onClick={() => bulkAdd("manual_love")} disabled={busy} className="bg-pink-600 hover:bg-pink-500 text-white w-full sm:w-auto">
                                <Save className="mr-2 h-4 w-4" /> Manuel Listeyi "Aşk Listesine" Kaydet
                            </Button>
                        </div>
                    </div>
                </div>

                {/* BÖLÜM 2: 90LAR */}
                <div className="border border-purple-500/30 rounded-3xl overflow-hidden bg-black/20">
                    <div className="bg-purple-900/20 p-4 border-b border-purple-500/30 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <Music className="text-purple-500" />
                            <h3 className="text-xl font-bold text-purple-100">90'LAR LİSTESİ YÖNETİMİ</h3>
                        </div>
                         <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
                            onClick={() => setShowDefaultConfirm({ type: "90lar", open: true })}
                        >
                            <UploadCloud className="mr-2 h-4 w-4" /> Varsayılan 90'ları Yükle
                        </Button>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-neutral-400 mb-2">
                            Aşağıdaki kutuya ekleyeceğiniz şarkılar direkt olarak <strong>90'lar</strong> listesine gider.
                        </p>
                        <div className="bg-black/30 p-2 rounded-lg mb-2 font-mono text-xs text-purple-300/70 border border-white/5">
                            Format: Şarkı Adı;NormalLink;KaraokeLink
                        </div>
                        <Textarea
                            value={bulkText90s}
                            onChange={(e) => setBulkText90s(e.target.value)}
                            placeholder={`Tarkan - Şımarık;https://...;https://...\nMFÖ - Ele Güne Karşı;https://...;https://...`}
                            className="retro-input-soft min-h-[150px] font-mono text-xs border-purple-500/20 focus:border-purple-500"
                        />
                        <div className="flex justify-end mt-4">
                            <Button onClick={() => bulkAdd("manual_90s")} disabled={busy} className="bg-purple-600 hover:bg-purple-500 text-white w-full sm:w-auto">
                                <Save className="mr-2 h-4 w-4" /> Manuel Listeyi "90'lar Listesine" Kaydet
                            </Button>
                        </div>
                    </div>
                </div>

              </TabsContent>
            )}

            {/* --- DENETİM VE TEHLİKELİ BÖLGE --- */}
            {canDangerZone && (
               <TabsContent value="audit" className="mt-6 space-y-8">
                 <div className="grid gap-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {sortedLogs.map((l) => (
                    <div key={l.id} className="border border-white/10 rounded-xl p-3 bg-white/5 text-sm flex justify-between hover:bg-white/10 transition-colors">
                      <div><span className="font-bold text-sky-300">{l.songTitle}</span> <span className="text-neutral-300">- {l.action}</span></div>
                      <div className="text-xs text-neutral-500">{l.timestamp?.toDate ? formatDistance(l.timestamp.toDate(), new Date(), { addSuffix: true, locale: tr }) : "..."}</div>
                    </div>
                  ))}
                </div>

                <div className="border border-red-900/50 bg-red-950/10 p-6 rounded-3xl mt-12">
                     <h2 className="text-xl font-bold mb-4 text-red-500 flex items-center gap-2"><ShieldAlert /> TEHLİKELİ BÖLGE</h2>
                     <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-red-200/70">
                            Buradaki işlemler geri alınamaz. Tüm veritabanını temizlemek istiyorsan butona bas.
                            <br/>(Lütfen emin olmadan basma, geri getiremem.)
                        </div>
                        <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} disabled={busy} className="bg-red-600 hover:bg-red-500 w-full sm:w-auto h-12 text-lg font-bold">
                            TÜM LİSTEYİ SİL
                        </Button>
                     </div>
                </div>
               </TabsContent>
            )}
            
          </Tabs>
        )}
      </div>

      {/* --- MODALLAR --- */}
      
      {/* 1. DÜZENLEME MODALI */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="bg-neutral-900 border-white/20 text-white sm:max-w-[500px]">
          <DialogHeader><DialogTitle className="text-2xl font-bold">Şarkı Detaylarını Düzenle</DialogTitle></DialogHeader>
          {editTarget && (
            <form onSubmit={(e) => {
                e.preventDefault();
                if (!firestore) return;
                const fd = new FormData(e.currentTarget);
                updateDocumentNonBlocking(doc(firestore, "song_requests", editTarget.id), {
                  studentName: String(fd.get("studentName")).trim(),
                  songTitle: String(fd.get("songTitle")).trim(),
                  songLink: String(fd.get("songLink")).trim(),
                  karaokeLink: String(fd.get("karaokeLink")).trim(),
                  category: String(fd.get("category")) as Category,
                });
                addAudit("Düzenlendi", String(fd.get("songTitle")));
                setEditTarget(null);
              }}>
              <div className="flex flex-col gap-5 py-6">
                <div className="space-y-1">
                    <label className="text-xs text-neutral-400 ml-1">İstek Yapan Kişi</label>
                    <Input name="studentName" defaultValue={editTarget.studentName} className="bg-black/50 border-white/10 h-10" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-neutral-400 ml-1">Şarkı Adı</label>
                    <Input name="songTitle" defaultValue={editTarget.songTitle} className="bg-black/50 border-white/10 h-10 font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs text-neutral-400 ml-1">Normal Link</label>
                        <Input name="songLink" defaultValue={editTarget.songLink || ""} className="bg-black/50 border-white/10 h-10 text-xs" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-pink-400 ml-1">Karaoke Link</label>
                        <Input name="karaokeLink" defaultValue={editTarget.karaokeLink} className="bg-black/50 border-pink-500/30 h-10 text-xs" />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-neutral-400 ml-1">Liste Kategorisi</label>
                    <Select name="category" defaultValue={editTarget.category || "90lar"}>
                        <SelectTrigger className="bg-black/50 border-white/10 h-10"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-white/10 text-white">
                            <SelectItem value="90lar">📼 90'lar Pop</SelectItem>
                            <SelectItem value="sevgililer">❤️ Sevgililer Günü</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
              </div>
              <DialogFooter className="gap-2">
                  <Button type="button" variant="ghost" onClick={() => setEditTarget(null)}>Vazgeç</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-500 w-full sm:w-auto">Değişiklikleri Kaydet</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 2. TOPLU YÜKLEME ONAY MODALI */}
      <Dialog open={showDefaultConfirm.open} onOpenChange={(val) => setShowDefaultConfirm({ ...showDefaultConfirm, open: val })}>
        <DialogContent className="bg-neutral-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className={`text-2xl font-black ${showDefaultConfirm.type === "sevgililer" ? "text-pink-500" : "text-purple-500"}`}>
                {showDefaultConfirm.type === "sevgililer" ? "❤️ Aşk Listesi Yükleniyor" : "📼 90'lar Listesi Yükleniyor"}
            </DialogTitle>
            <DialogDescription className="text-neutral-300 pt-2">
               Bu işlem seçilen hazır listeyi veritabanına ekler. Mevcut şarkılar silinmez, üzerine eklenir.
               <br/><br/>
               <strong>Eklenecek Liste:</strong> {showDefaultConfirm.type === "sevgililer" ? "Varsayılan Sevgililer Günü (50 Şarkı)" : "Varsayılan 90'lar Klasikleri"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
             <Button variant="ghost" onClick={() => setShowDefaultConfirm({ type: null, open: false })}>İptal</Button>
             <Button 
                onClick={() => bulkAdd(showDefaultConfirm.type === "sevgililer" ? "default_love" : "default_90s")} 
                className={showDefaultConfirm.type === "sevgililer" ? "bg-pink-600 hover:bg-pink-500" : "bg-purple-600 hover:bg-purple-500"}
             >
                Onayla ve Yükle
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. SİLME ONAY MODALI */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-red-950 border-red-500/50 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-500 text-3xl font-black">HER ŞEYİ SİL?</DialogTitle>
            <DialogDescription className="text-red-200 text-lg mt-2">
                Bu işlemin geri dönüşü yoktur. Veritabanındaki bütün şarkılar (bekleyenler, onaylılar) kalıcı olarak silinecektir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-6">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)} className="hover:bg-red-900/20 text-white">Vazgeç, Silme</Button>
            <Button variant="destructive" onClick={deleteAll} className="bg-red-600 hover:bg-red-500 font-bold px-6">Evet, SİL</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VhsOverlay intensity={0.05} sfxVolume={0} />
    </div>
  );
}
