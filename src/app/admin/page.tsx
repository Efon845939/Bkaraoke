
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


  const sortedSongs = React.useMemo(() => {
    if (!songs) return [];
    // Convert Firestore Timestamps to JS Dates
    const songsWithDates = songs.map(song => ({
        ...song,
        submissionDate: (song.submissionDate as any)?.toDate ? (song.submissionDate as any).toDate() : new Date(),
    }));

    // Sort the songs based on status and submission date
    return songsWithDates.sort((a, b) => {
        const statusOrder = { playing: 1, queued: 2, played: 3 };
        const aStatus = statusOrder[a.status] || 99;
        const bStatus = statusOrder[b.status] || 99;

        if (aStatus !== bStatus) {
            return aStatus - bStatus;
        }

        // For songs with the same status, sort by submission date (oldest first)
        return a.submissionDate.getTime() - b.submissionDate.getTime();
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
