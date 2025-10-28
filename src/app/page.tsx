
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { SongQueue } from '@/components/song-queue';
import { SongSubmissionForm } from '@/components/song-submission-form';
import type { Song } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

export default function PublicPage() {
  const router = useRouter();
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
          requesterName: newSong.name,
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
        <h1 className="text-3xl font-headline tracking-wider text-primary">Karaoke Sırası</h1>
        <Button onClick={() => router.push('/admin')}>Yönetici Paneli</Button>
      </header>
      <main className="space-y-8">
        <SongSubmissionForm onSongAdd={handleSongAdd} showNameInput={true} />
        <SongQueue
          songs={songs}
          isLoading={isLoading}
          onEditSong={() => {}}
          isAdmin={false}
        />
      </main>
    </div>
  );
}
