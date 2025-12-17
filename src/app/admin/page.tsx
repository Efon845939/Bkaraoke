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
import { ShieldAlert, Pencil, Trash2 } from "lucide-react";
import { formatDistance } from "date-fns";
import { tr } from "date-fns/locale";
import { Input } from "@/components/ui/input";

type Role = "owner" | "admin";

type Song = {
  id: string;
  studentName: string;
  songTitle: string;
  songLink?: string;
  karaokeLink: string;
  status: "pending" | "approved" | "rejected";
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
 * DEFAULT_BULK_TEXT:
 * Format: "Yazar-Şarkı\tNormalLink\tKaraokeLink"
 *
 * Admin sayfasında "Varsayılan Listeyi Ekle" basınca bu liste DB'ye "approved" olarak gider.
 */
const DEFAULT_BULK_TEXT = [
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
  "Aşkın Nur Yengi - Yalancı Bahar\thttps://www.youtube.com/watch?v=kGkezfjlDlQ&list=RDkGkezfjlDlQ&start_radio=1\thttps://www.youtube.com/watch?v=v5XZOGFOoOE&list=RDv5XZOGFOoOE&start_radio=1",
] as const;


function buildDefaultBulkAsTextareaValue() {
  // Admin bulk textbox formatı: "Şarkı Adı;Karaoke Linki"
  // Bizim default list: "Başlık\tNormal\tKaraoke"
  // Buradan karaoke linkini alıp textarea formatına çeviriyoruz.
  return DEFAULT_BULK_TEXT.map((line) => {
    const parts = line.split("\t").map((p) => p.trim());
    const title = parts[0] || "";
    const normal = parts[1] || "";
    const karaoke = parts[2] || "";
    return `${title};${normal};${karaoke}`;

  }).join("\n");
}

function AccessPanel({
  onLogin,
  error,
}: {
  onLogin: (pw: string) => void;
  error: string | null;
}) {
  const [pw, setPw] = useState("");
  return (
    <div className="min-h-screen grid place-items-center relative">
      <div className="mx-auto w-[min(400px,90%)]">
        <h1 className="text-2xl font-black mb-4">Erişim Paneli</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onLogin(pw);
          }}
          className="flex flex-col gap-3"
        >
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
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

      <VhsOverlay intensity={0.1} sfxVolume={0.35} />
    </div>
  );
}

export default function AdminPage() {
  const { firestore, auth } = useFirebase();

  const [role, setRole] = useState<Role | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [bulkText, setBulkText] = useState("");
  const [busy, setBusy] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDefaultConfirm, setShowDefaultConfirm] = useState(false);

  const [editTarget, setEditTarget] = useState<Song | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Song | null>(null);

  // Auth fix: Admin sayfası da request.auth alsın (rules bunu istiyor)
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
    // Sadece owner/admin görsün diye UI tarafında role ile zaten gizliyoruz
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

  const pending = sortedSongs.filter((s) => s.status === "pending");
  const approved = sortedSongs.filter((s) => s.status === "approved");
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

  async function bulkAdd(useDefault: boolean) {
    if (!firestore || !auth?.currentUser) return;
    setBusy(true);

    const text = useDefault ? buildDefaultBulkAsTextareaValue() : bulkText;

    const lines = normalizeLine(text).split("\n").map(normalizeLine).filter(Boolean);
    if (!lines.length) {
      setBusy(false);
      alert("Liste boş.");
      return;
    }

    const batchSongs = writeBatch(firestore);
    const batchLogs = writeBatch(firestore);

    let ok = 0;
    let bad = 0;

    for (const line of lines) {
      // expected: "Title;KaraokeLink"
      const parts = line.split(";").map((p) => p.trim());
      if (parts.length !== 3) {
        bad++;
        continue;
      }

      const [title, normalLink, karaoke] = parts;
      if (!title || !karaoke || !isProbablyUrl(karaoke)) {
        bad++;
        continue;
      }

      const songRef = doc(collection(firestore, "song_requests"));
      batchSongs.set(songRef, {
  studentName: "Sistem (Varsayılan/Toplu)",
  songTitle: title,
  songLink: normalLink,      // ← BUNU EKLİYORSUN
  karaokeLink: karaoke,
  status: "approved",
  createdAt: serverTimestamp(),
  studentId: auth.currentUser.uid,
});


      const logRef = doc(collection(firestore, "audit_logs"));
      batchLogs.set(logRef, {
        action: "Toplu olarak eklendi ve onaylandı",
        songTitle: title,
        performedBy: role ?? "admin",
        timestamp: serverTimestamp(),
      });

      ok++;
    }

    try {
      await batchSongs.commit();
      await batchLogs.commit();
      alert(`${ok} şarkı eklendi. Hatalı satır: ${bad}`);
      if (!useDefault) setBulkText("");
    } catch (e) {
      console.error("Bulk add failed:", e);
      alert("Toplu ekleme başarısız.");
    } finally {
      setBusy(false);
      setShowDefaultConfirm(false);
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
      alert("Tüm liste silindi.");
    } catch (e) {
      console.error("Delete all failed:", e);
      alert("Silme başarısız (permission ise: auth/rules tarafını kontrol et).");
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

  // Login: (senin mevcut mantığın) md5 check burada olmalıydı. Bende aynı şekilde bıraktım:
  function handleLogin(pw: string) {
  const hashed = md5(pw).toString();

  // owner: gizli_bkara90ke
  if (hashed === "0a8a46f5c4a84c9f35cf8f8a231d1936") {
    setRole("owner");
    setLoginError(null);
    setBulkText(buildDefaultBulkAsTextareaValue());
    return;
  }

  // admin: bkara90ke
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
    <div className="min-h-screen p-6 relative">
      <div className="mx-auto w-[min(1100px,92%)]">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black">
            {role === "owner" ? "Sahip Paneli" : "Yönetici Paneli"}
          </h1>
          <Link href="/" className="rounded-2xl px-4 py-3 border border-white/20">
            Lobiye Dön
          </Link>
        </div>

        {loading && <p>Yükleniyor...</p>}

        {!loading && (
          <Tabs defaultValue="requests">
            <TabsList>
              <TabsTrigger value="requests">Şarkı İstekleri</TabsTrigger>
              {canDangerZone && <TabsTrigger value="bulk-add">Toplu Ekle</TabsTrigger>}
              {canDangerZone && <TabsTrigger value="audit">Denetim Kayıtları</TabsTrigger>}
            </TabsList>

            <TabsContent value="requests" className="mt-6">
              <section>
                <h2 className="text-xl font-bold mb-3 text-neutral-300">
                  Onay Bekleyenler ({pending.length})
                </h2>
                <div className="grid gap-2">
                  {pending.map((s) => (
                    <div
                      key={s.id}
                      className="border border-white/15 rounded-2xl p-3 flex justify-between items-center bg-white/5 backdrop-blur"
                    >
                      <div>
                        <strong>{s.studentName}</strong> — {s.songTitle}
                        <a
                          href={s.karaokeLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-fuchsia-300 hover:underline break-all"
                        >
                          {s.karaokeLink}
                        </a>
                      </div>

                      {canModerate && (
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={() => setStatus(s, "approved")}
                            className="rounded-xl px-3 py-2 bg-green-500/20 text-green-300"
                          >
                            Onayla
                          </button>
                          <button
                            onClick={() => setStatus(s, "rejected")}
                            className="rounded-xl px-3 py-2 bg-red-500/20 text-red-300"
                          >
                            Reddet
                          </button>

                          <Button
                            onClick={() => setEditTarget(s)}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            onClick={() => setDeleteTarget(s)}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-8">
                <h2 className="text-xl font-bold mb-3 text-neutral-400">
                  Onaylananlar ({approved.length})
                </h2>
                <div className="grid gap-2">
                  {approved.map((s) => (
                    <div
                      key={s.id}
                      className="border border-white/15 rounded-2xl p-3 flex justify-between items-center bg-black/20 backdrop-blur opacity-70"
                    >
                      <div>
                        <strong>{s.studentName}</strong> — {s.songTitle}
                        <a
                          href={s.karaokeLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-fuchsia-300 hover:underline break-all"
                        >
                          {s.karaokeLink}
                        </a>
                      </div>

                      {canModerate && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setStatus(s, "pending")}
                            className="rounded-xl px-3 py-2 bg-yellow-500/20 text-yellow-300 text-xs"
                          >
                            Beklemeye Al
                          </button>

                          <Button
                            onClick={() => setEditTarget(s)}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            onClick={() => setDeleteTarget(s)}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-8">
                <h2 className="text-xl font-bold mb-3 text-neutral-500">
                  Reddedilenler ({rejected.length})
                </h2>
                <div className="grid gap-2">
                  {rejected.map((s) => (
                    <div
                      key={s.id}
                      className="border border-white/15 rounded-2xl p-3 flex justify-between items-center bg-black/20 backdrop-blur opacity-70"
                    >
                      <div>
                        <strong>{s.studentName}</strong> — {s.songTitle}
                        <a
                          href={s.karaokeLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-fuchsia-300 hover:underline break-all"
                        >
                          {s.karaokeLink}
                        </a>
                      </div>

                      {canModerate && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setStatus(s, "pending")}
                            className="rounded-xl px-3 py-2 bg-yellow-500/20 text-yellow-300 text-xs"
                          >
                            Beklemeye Al
                          </button>

                          <Button
                            onClick={() => setEditTarget(s)}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            onClick={() => setDeleteTarget(s)}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {canDangerZone && (
                <section className="mt-12 border-t-2 border-red-500/30 pt-6">
                  <h2 className="text-xl font-bold mb-3 text-red-400 flex items-center gap-2">
                    <ShieldAlert /> Tehlikeli Alan
                  </h2>
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-white">Veritabanı Operasyonları</h3>
                      <p className="text-sm text-red-300/80 mt-1">
                        Bu işlemler geri alınamaz.
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Button
                        variant="destructive"
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={busy}
                      >
                        Tüm Listeyi Sil
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setShowDefaultConfirm(true)}
                        disabled={busy}
                      >
                        Varsayılan Listeyi Ekle
                      </Button>
                    </div>
                  </div>
                </section>
              )}
            </TabsContent>

            {canDangerZone && (
              <TabsContent value="bulk-add" className="mt-6">
                <h2 className="text-xl font-bold mb-3 text-neutral-300">Şarkıları Toplu Ekle</h2>
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-neutral-400">
                    Her satır: <code className="bg-white/10 px-2 py-1 rounded-md text-fuchsia-300">
                      Şarkı Adı;NormalLink;KaraokeLink
                    </code>
                  </p>

                  <textarea
                    id="bulk-textarea"
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder="Şebnem Ferah-Sil Baştan;https://youtube.com/..."
                    className="retro-input-soft min-h-[200px]"
                    rows={10}
                  />

                  <div className="flex justify-end">
                    <Button onClick={() => bulkAdd(false)} disabled={busy}>
                      {busy ? "Ekleniyor..." : "Metin Alanındaki Listeyi Ekle"}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            )}

            {canDangerZone && (
              <TabsContent value="audit" className="mt-6">
                <h2 className="text-xl font-bold mb-3 text-neutral-300">Son Hareketler</h2>
                <div className="grid gap-2">
                  {sortedLogs.map((l) => (
                    <div
                      key={l.id}
                      className="border border-white/15 rounded-2xl p-3 bg-white/5 backdrop-blur text-sm"
                    >
                      <span className="font-bold text-fuchsia-300">{l.songTitle}</span>{" "}
                      - <span className="text-neutral-300">{l.action}</span>
                      <div className="text-xs text-neutral-400 mt-1">
                        {l.performedBy === "owner" ? "Sahip" : "Yönetici"} tarafından,{" "}
                        {l.timestamp?.toDate
                          ? formatDistance(l.timestamp.toDate(), new Date(), {
                              addSuffix: true,
                              locale: tr,
                            })
                          : "az önce"}
                        .
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Şarkıyı Düzenle</DialogTitle>
            <DialogDescription>Şarkı detaylarını güncelleyin.</DialogDescription>
          </DialogHeader>

          {editTarget && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!firestore) return;

                const fd = new FormData(e.currentTarget);
                const studentName = String(fd.get("studentName") || "").trim();
                const songTitle = String(fd.get("songTitle") || "").trim();
                const karaokeLink = String(fd.get("karaokeLink") || "").trim();

                updateDocumentNonBlocking(doc(firestore, "song_requests", editTarget.id), {
                  studentName,
                  songTitle,
                  karaokeLink,
                });

                addAudit("Düzenlendi", songTitle);
                setEditTarget(null);
              }}
            >
              <div className="flex flex-col gap-4 py-4">
                <Input name="studentName" defaultValue={editTarget.studentName} placeholder="İsim" />
                <Input name="songTitle" defaultValue={editTarget.songTitle} placeholder="Şarkı Başlığı" />
                <Input
                  name="karaokeLink"
                  defaultValue={editTarget.karaokeLink}
                  placeholder="Karaoke Linki"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setEditTarget(null)}>
                  İptal
                </Button>
                <Button type="submit">Kaydet</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete single */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emin misiniz?</DialogTitle>
            <DialogDescription>Bu işlem geri alınamaz.</DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteTarget) return;
                doDelete(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete all */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tüm Şarkıları Silmek Üzeresiniz!</DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz. Veritabanındaki tüm şarkılar kalıcı olarak silinir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={deleteAll} disabled={busy}>
              {busy ? "Siliniyor..." : "Evet, Tümünü Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Default add */}
      <Dialog open={showDefaultConfirm} onOpenChange={setShowDefaultConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Varsayılan Listeyi Ekle?</DialogTitle>
            <DialogDescription>
              Bu işlem varsayılan repertuvarı veritabanına ekler. Mevcut şarkıların üstüne yazmaz,
              sadece ekleme yapar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDefaultConfirm(false)}>
              İptal
            </Button>
            <Button onClick={() => bulkAdd(true)} disabled={busy}>
              {busy ? "Ekleniyor..." : "Evet, Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VhsOverlay intensity={0.1} sfxVolume={0} />
    </div>
  );
}
