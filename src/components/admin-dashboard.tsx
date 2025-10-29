
'use client';

import * as React from 'react';
import Link from 'next/link';
import type { Song } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

import { PageHeader } from '@/components/page-header';
import { SongQueue } from '@/components/song-queue';
import { SongSubmissionForm } from '@/components/song-submission-form';
import { Button } from './ui/button';
import { Home } from 'lucide-react';
import { useFirestore } from '@/firebase';


export function AdminDashboard() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [songs, setSongs] = React.useState<Song[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!firestore) return;
    setIsLoading(true);
    const songsCollection = collection(firestore, 'song_requests');
    const q = query(songsCollection, orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const songList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submissionDate: doc.data().submissionDate?.toDate()
      } as Song));
      setSongs(songList);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching songs:", error);
      toast({
        variant: "destructive",
        title: "Hata!",
        description: "Şarkı listesi yüklenemedi.",
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, toast]);


 const handleSongAdd = async (newSong: { title: string; url: string; name: string }) => {
    if (!firestore) return;
    try {
      const newId = uuidv4();
      const maxOrder = songs.reduce((max, song) => Math.max(song.order, max), -1);
      
      await addDoc(collection(firestore, 'song_requests'), {
          id: newId,
          title: newSong.title,
          karaokeUrl: newSong.url,
          requesterName: newSong.name || 'Admin',
          submissionDate: serverTimestamp(),
          order: maxOrder + 1,
          studentId: 'anonymous', 
      });

      toast({
        title: 'İstek Gönderildi!',
        description: `"${newSong.title}" sıraya eklendi.`,
        duration: 3000,
      });
    } catch (error) {
        console.error("Error adding song:", error);
        toast({
            variant: "destructive",
            title: "Hata!",
            description: "Şarkı eklenirken bir sorun oluştu.",
        });
    }
  };

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-8">
      <header className="sticky top-4 z-10 mb-8 flex items-center justify-between rounded-lg border bg-card/80 p-4 shadow-md backdrop-blur-sm">
        <PageHeader />
        <Link href="/" passHref>
          <Button variant="outline">
            <Home className="mr-2 h-4 w-4" />
            Lobiye Dön
          </Button>
        </Link>
      </header>
      <main className="space-y-8">
        <SongSubmissionForm onSongAdd={handleSongAdd} showNameInput={true} />
        <SongQueue
          songs={songs || []}
          isLoading={isLoading}
          isAdmin={false} // Admin yetkileri kısıtlandı
        />
      </main>
    </div>
  );
}
