
'use client';

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import RetroKaraokeLobby from "@/components/RetroKaraokeLobby";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const router = useRouter();
  const { toast } = useToast();

  async function handleSongSubmit(data: {
    firstName: string;
    lastName: string;
    songTitle: string;
    songUrl: string;
  }) {
    try {
      await addDoc(collection(db, "song_requests"), {
        ...data,
        status: "pending",
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.error("Error adding document: ", e);
      // Bu hatayı yukarıdaki bileşene iletiyoruz ki 'busy' durumu sıfırlansın.
      throw new Error("Şarkı isteği gönderilirken bir sunucu hatası oluştu.");
    }
  }

  function handleAdminClick() {
    router.push('/admin');
  }

  return (
    <RetroKaraokeLobby 
      handleSubmit={handleSongSubmit}
      onAdminClick={handleAdminClick}
    />
  );
}
