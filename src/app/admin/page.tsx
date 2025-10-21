
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { SongQueue } from '@/components/song-queue';
import { SongSubmissionForm } from '@/components/song-submission-form';
import type { Song } from '@/types';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { EditSongDialog } from '@/components/edit-song-dialog';
import { arrayMove } from '@dnd-kit/sortable';


export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [editingSong, setEditingSong] = React.useState<Song | null>(null);
  const [songList, setSongList] = React.useState<Song[]>([]);

  const isAdmin = user?.email === 'admin@karaoke.app';

  React.useEffect(() => {
    if (!isUserLoading && !isAdmin) {
      router.push('/');
    }
  }, [user, isUserLoading, router, isAdmin]);

  const songsQuery = useMemoFirebase(() => {
    if (!firestore || !isAdmin) return null;
    return collection(firestore, 'song_requests');
  }, [firestore, isAdmin]);

  const { data: songsFromHook, isLoading } = useCollection<Song>(songsQuery);

  React.useEffect(() => {
    if (songsFromHook) {
      const sorted = [...songsFromHook].sort((a, b) => {
        if (a.status === 'playing' && b.status !== 'playing') return -1;
        if (b.status === 'playing' && a.status !== 'playing') return 1;
        if (a.status === 'played' && b.status !== 'played') return 1;
        if (b.status === 'played' && a.status !== 'played') return -1;
        return (a.order ?? Infinity) - (b.order ?? Infinity);
      });
      setSongList(sorted);
    }
  }, [songsFromHook]);


  const handleSongAdd = (newSong: { title: string; url: string; firstName?: string; lastName?: string }) => {
    if (!firestore || !user) return;
  
    const requesterName = newSong.firstName && newSong.lastName 
      ? `${newSong.firstName} ${newSong.lastName}`
      : 'Yönetici';
    const studentId = user.uid;
  
    const studentDocRef = doc(firestore, 'students', studentId);
    const songRequestDocRef = doc(collection(firestore, 'song_requests'));
  
    const batch = writeBatch(firestore);
    batch.set(studentDocRef, { id: studentId, name: 'Yönetici Kullanıcısı' }, { merge: true });
    batch.set(songRequestDocRef, {
      title: newSong.title,
      karaokeUrl: newSong.url,
      id: songRequestDocRef.id,
      studentId: studentId,
      studentName: requesterName,
      submissionDate: serverTimestamp(),
      status: 'queued',
      order: songList?.length ?? 0,
    });
  
    batch.commit().catch(e => console.error("Şarkı eklenirken hata oluştu:", e));
  };
  
  const handleSongUpdate = (songId: string, updatedData: { title: string; url: string }) => {
    if (!firestore) return;
    const songDocRef = doc(firestore, 'song_requests', songId);
    
    const songToUpdate = songList.find(s => s.id === songId);
    if (songToUpdate) {
        const batch = writeBatch(firestore);
        batch.update(songDocRef, {
            title: updatedData.title,
            karaokeUrl: updatedData.url,
        });
        batch.commit().catch(e => console.error("Şarkı güncellenirken hata oluştu:", e));
    }
    setEditingSong(null);
  };

  const handleReorder = (reorderedSongs: Song[]) => {
    if (!firestore) return;

    // Instantly update the UI
    setSongList(reorderedSongs);

    const batch = writeBatch(firestore);
    reorderedSongs.forEach((song, index) => {
      const songRef = doc(firestore, 'song_requests', song.id);
      batch.update(songRef, { order: index });
    });

    batch.commit().catch(e => {
        console.error("Şarkılar yeniden sıralanırken hata oluştu:", e)
        // If the commit fails, revert to the original list from the hook
        if(songsFromHook) {
            setSongList(songsFromHook);
        }
    });
  };

  if (isUserLoading || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Yönetici Erişimi Yükleniyor ve Doğrulanıyor...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader />
      <main className="space-y-8">
        <SongSubmissionForm
          onSongAdd={handleSongAdd}
          studentName="Yönetici"
          showNameInput={true}
        />
        <h2 className="mb-4 text-3xl tracking-wider">Yönetici Paneli</h2>
        <SongQueue
          role="admin"
          songs={songList}
          isLoading={isLoading && songList.length === 0}
          onEditSong={setEditingSong}
          onReorder={handleReorder}
        />
      </main>
      {editingSong && (
        <EditSongDialog
          song={editingSong}
          isOpen={!!editingSong}
          onOpenChange={(isOpen) => !isOpen && setEditingSong(null)}
          onSongUpdate={handleSongUpdate}
        />
      )}
    </div>
  );
}
