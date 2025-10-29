'use client';

import RetroKaraokeLobby from "@/components/RetroKaraokeLobby";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  function handleAdminClick() {
    router.push('/admin');
  }

  // handleSubmit prop'u artık localStorage tarafından yönetildiği için burada boş.
  // Plan B'ye geçildiğinde burası yeniden doldurulacak.
  return (
    <RetroKaraokeLobby 
      onAdminClick={handleAdminClick}
    />
  );
}
