
'use client';

import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Home } from "lucide-react";

export default function AdminPanel() {
  const [auth, setAuth] = useState(false);
  const [input, setInput] = useState("");
  const [songs, setSongs] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(false);

  const ADMIN_PASS = "90'sKaraoke";

  useEffect(() => {
    if (auth) {
      loadSongs();
    }
  }, [auth, refresh]);

  async function loadSongs() {
    const q = query(collection(db, "song_requests"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    setSongs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  async function updateStatus(id: string, status: "approved" | "rejected") {
    await updateDoc(doc(db, "song_requests", id), { status });
    setRefresh(!refresh);
  }

  if (!auth) {
    return (
      <div className="flex min-h-screen flex-col items-center bg-background p-4">
        <header className="sticky top-4 z-10 mb-8 flex w-full max-w-sm items-center justify-between rounded-lg border bg-card/80 p-4 shadow-md backdrop-blur-sm">
            <Link href="/" passHref>
               <Logo />
            </Link>
        </header>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Yönetici Girişi</CardTitle>
            <CardDescription>
              Lütfen yönetici paneline erişmek için parolayı girin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Admin Şifresi"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setAuth(input === ADMIN_PASS)}
            />
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => setAuth(input === ADMIN_PASS)}
              className="w-full"
            >
              Giriş
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-8">
       <header className="sticky top-4 z-10 mb-8 flex items-center justify-between rounded-lg border bg-card/80 p-4 shadow-md backdrop-blur-sm">
        <Logo />
        <div className="flex items-center gap-4">
            <Button onClick={()=>setRefresh(!refresh)} variant="outline">Yenile</Button>
            <Button onClick={()=>setAuth(false)} variant="destructive">Çıkış</Button>
            <Link href="/" passHref>
              <Button variant="outline">
                <Home className="mr-2 h-4 w-4" />
                Lobiye Dön
              </Button>
            </Link>
        </div>
      </header>

      <Card>
        <CardHeader>
            <CardTitle>Tüm Şarkı İstekleri</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid gap-4">
            {songs.map(s => (
              <div key={s.id} className="border p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1">
                  <strong className="text-lg">{s.firstName} {s.lastName}</strong>
                  <p className="text-md">{s.songTitle}</p>
                  <a href={s.songUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline break-all">{s.songUrl}</a>
                  <p className={`mt-2 text-sm font-bold ${s.status === "approved" ? "text-green-600" : s.status === "rejected" ? "text-red-600" : "text-gray-600"}`}>
                    Durum: {s.status}
                  </p>
                </div>
                <div className="flex gap-2 self-start sm:self-center">
                  <Button onClick={()=>updateStatus(s.id, "approved")} variant="secondary" className="bg-green-500 hover:bg-green-600 text-white">Onayla</Button>
                  <Button onClick={()=>updateStatus(s.id, "rejected")} variant="destructive">Reddet</Button>
                </div>
              </div>
            ))}
            {songs.length === 0 && <p className="text-center text-muted-foreground">Henüz şarkı isteği yok.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
