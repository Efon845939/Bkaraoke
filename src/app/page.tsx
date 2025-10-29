
'use client';

import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function Lobby() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [songUrl, setSongUrl] = useState("");
  const { toast } = useToast();

  const capitalizeWords = (str: string) =>
    str.replace(/\b\w/g, l => l.toUpperCase());

  const validate = () => {
    if (!firstName || !lastName || !songTitle || !songUrl)
      return "Lütfen tüm alanları doldurun.";
    if (songTitle.length < 2)
      return "Şarkı başlığı en az 2 karakter olmalı.";
    if (!/^https?:\/\//i.test(songUrl))
      return "Geçerli bir URL girin.";
    return null;
  };

  async function submit() {
    const err = validate();
    if (err) {
      toast({
        variant: "destructive",
        title: "Hata!",
        description: err,
      });
      return;
    }

    try {
      await addDoc(collection(db, "song_requests"), {
        firstName: capitalizeWords(firstName.trim()),
        lastName: capitalizeWords(lastName.trim()),
        songTitle: capitalizeWords(songTitle.trim()),
        songUrl: songUrl.trim(),
        status: "pending",
        timestamp: serverTimestamp(),
      });
      toast({
        title: "🎵 Şarkınızın isteği alınmıştır.",
        description: "Katılımınız için teşekkürler!",
      });
      setFirstName(""); 
      setLastName(""); 
      setSongTitle(""); 
      setSongUrl("");
    } catch (error) {
      console.error("Error adding document: ", error);
      toast({
        variant: "destructive",
        title: "Veritabanı Hatası",
        description: "Şarkı isteği gönderilemedi. Lütfen tekrar deneyin.",
      });
    }
  }

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-8">
       <header className="sticky top-4 z-10 mb-8 flex items-center justify-between rounded-lg border bg-card/80 p-4 shadow-md backdrop-blur-sm">
        <Link href="/" passHref>
           <Logo />
        </Link>
        <Link href="/admin" passHref>
          <Button>Yönetici Paneli</Button>
        </Link>
      </header>
      <main className="flex justify-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle>Bir Şarkı İste!</CardTitle>
            <CardDescription>
              Favori karaoke parçanızı listeye ekleyin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="Adınız" className="flex-1"/>
              <Input value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="Soyadınız" className="flex-1"/>
            </div>
            <Input value={songTitle} onChange={e=>setSongTitle(e.target.value)} placeholder="Şarkı Başlığı" />
            <Input value={songUrl} onChange={e=>setSongUrl(e.target.value)} placeholder="Şarkı URL" />
          </CardContent>
          <CardFooter>
            <Button onClick={submit}>Gönder</Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
