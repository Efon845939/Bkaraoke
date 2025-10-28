
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { SongQueue } from '@/components/song-queue';
import { SongSubmissionForm } from '@/components/song-submission-form';
import type { Song } from '@/types';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  errorEmitter,
  FirestorePermissionError,
} from '@/firebase';
import {
  collection,
  serverTimestamp,
  doc,
  writeBatch,
  getDocs,
  addDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export default function PublicPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const songsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'song_requests'), orderBy('order', 'asc'));
  }, [firestore]);

  const { data: songs, isLoading: songsLoading } = useCollection<Song>(songsQuery);

  const handleSongAdd = async (newSong: { title: string; url: string; name: string }) => {
    if (!firestore) return;

    const requesterName = newSong.name || 'Anonymous';

    const totalSongsSnapshot = await getDocs(collection(firestore, 'song_requests'));
    const totalSongs = totalSongsSnapshot.size;

    const songRequestDocRef = doc(collection(firestore, 'song_requests'));
    const songData = {
      id: songRequestDocRef.id,
      title: newSong.title,
      karaokeUrl: newSong.url,
      studentId: 'anonymous', 
      requesterName: requesterName,
      submissionDate: serverTimestamp(),
      order: totalSongs,
    };
    
    addDoc(collection(firestore, 'song_requests'), songData).catch(e => {
       errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'song_requests', 
            operation: 'create',
            requestResourceData: songData
       }));
    });

    toast({
      title: 'İstek Gönderildi!',
      description: `"${newSong.title}" sıraya eklendi.`,
      duration: 3000,
    });
  };

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-8">
       <header className="sticky top-4 z-10 mb-8 flex items-center justify-between rounded-lg border bg-card/80 p-4 shadow-md backdrop-blur-sm">
        <h1 className="text-3xl font-headline tracking-wider text-primary">Karaoke Sırası</h1>
        <Button onClick={() => router.push('/admin')}>Yönetici Girişi</Button>
      </header>
      <main className="space-y-8">
        <SongSubmissionForm onSongAdd={handleSongAdd} showNameInput={true} />
        <SongQueue
          songs={songs || []}
          isLoading={songsLoading}
          onEditSong={() => {}}
        />
      </main>
    </div>
  );
}
