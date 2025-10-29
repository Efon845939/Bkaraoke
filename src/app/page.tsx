
'use client';

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import RetroKaraokeLobby from "@/components/RetroKaraokeLobby";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  async function handleSongSubmit(data: {
    firstName: string;
    lastName: string;
    songTitle: string;
    songUrl: string;
  }) {
    await addDoc(collection(db, "song_requests"), {
      ...data,
      status: "pending",
      timestamp: serverTimestamp(),
    });
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
