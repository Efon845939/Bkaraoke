'use client';

import RetroKaraokeLobby from "@/components/RetroKaraokeLobby";
import { useRouter } from "next/navigation";


export default function Home() {
  const router = useRouter();

  function handleAdminClick() {
    router.push('/admin');
  }

  return (
    <RetroKaraokeLobby 
      onAdminClick={handleAdminClick}
    />
  );
}
