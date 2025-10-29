
'use client';

import * as React from 'react';
import { SongSubmissionForm } from '@/components/song-submission-form';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';

const SONG_REQUEST_LIMIT = 5;

export default function PublicPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleSongAdd = async (newSong: { title: string; url: string; name: string }) => {
    if (!firestore) return;

    try {
      const requesterSongsQuery = query(
        collection(firestore, 'song_requests'),
        where('requesterName', '==', newSong.name)
      );
      const querySnapshot = await getDocs(requesterSongsQuery);
      
      if (querySnapshot.size >= SONG_REQUEST_LIMIT) {
        toast({
          variant: "destructive",
          title: "İstek Limiti Aşıldı!",
          description: `Her kişi en fazla ${SONG_REQUEST_LIMIT} şarkı isteyebilir.`,
        });
        return;
      }
      
      const songDocs = await getDocs(collection(firestore, 'song_requests'));
      const maxOrder = songDocs.docs.reduce((max, doc) => Math.max(doc.data().order, max), -1);

      const newId = uuidv4();
      
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
        title: 'Katılımınız için teşekkürler!',
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
      </main>
    </div>
  );
}
