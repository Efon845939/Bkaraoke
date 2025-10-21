
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { SongQueue } from '@/components/song-queue';
import { SongSubmissionForm } from '@/components/song-submission-form';
import type { Song } from '@/types';
import { useFirestore, useCollection, useMemoFirebase, useUser, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { EditSongDialog } from '@/components/edit-song-dialog';

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [editingSong, setEditingSong] = React.useState<Song | null>(null);

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

  const { data: songs, isLoading } = useCollection<Song>(songsQuery);

  const handleSongAdd = (newSong: { title: string; url: string; name?: string }) => {
    if (!firestore || !user) return;

    const requesterName = newSong.name || 'Admin';
    const studentId = user.uid;

    const studentDocRef = doc(firestore, 'students', studentId);
    const songRequestDocRef = doc(collection(firestore, 'song_requests'));

    const batch = writeBatch(firestore);
    batch.set(studentDocRef, { id: studentId, name: 'Admin User' }, { merge: true });
    batch.set(songRequestDocRef, {
      title: newSong.title,
      karaokeUrl: newSong.url,
      id: songRequestDocRef.id,
      studentId: studentId,
      studentName: requesterName,
      submissionDate: serverTimestamp(),
      status: 'queued',
      order: songs?.length ?? 0,
    });

    batch.commit().catch(e => console.error("Error adding song:", e));
  };
  
  const handleSongUpdate = (songId: string, updatedData: { title: string; url: string }) => {
    if (!firestore) return;
    const songDocRef = doc(firestore, 'song_requests', songId);
    updateDocumentNonBlocking(songDocRef, {
      title: updatedData.title,
      karaokeUrl: updatedData.url,
    });
    setEditingSong(null);
  };

  const handleReorder = (reorderedSongs: Song[]) => {
    if (!firestore) return;

    const batch = writeBatch(firestore);
    reorderedSongs.forEach((song, index) => {
      const songRef = doc(firestore, 'song_requests', song.id);
      batch.update(songRef, { order: index });
    });

    batch.commit().catch(e => console.error("Error reordering songs:", e));
  };


  const sortedSongs = React.useMemo(() => {
    if (!songs) return [];
    // The useCollection hook already provides a live stream of data.
    // When the `order` property is updated in Firestore, the hook will
    // provide a new `songs` array, and this useMemo will re-run.
    // We just need to ensure the sorting logic is correct.
    return [...songs].sort((a, b) => {
        // Handle status priority first
        if (a.status === 'playing') return -1;
        if (b.status === 'playing') return 1;
        if (a.status === 'played' && b.status !== 'played') return 1;
        if (b.status === 'played' && a.status !== 'played') return -1;

        // For songs with the same status (e.g., all 'queued'), sort by the 'order' field.
        // A lower order number means it comes first.
        return (a.order ?? 999) - (b.order ?? 999);
    });
  }, [songs]);

  if (isUserLoading || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading & Verifying Admin Access...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader />
      <main className="space-y-8">
        <SongSubmissionForm
          onSongAdd={handleSongAdd}
          studentName="Admin"
          showNameInput={true}
        />
        <h2 className="mb-4 text-3xl tracking-wider">Admin Dashboard</h2>
        <SongQueue
          role="admin"
          songs={sortedSongs}
          isLoading={isLoading || isUserLoading}
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
