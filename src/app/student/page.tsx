
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { SongQueue } from '@/components/song-queue';
import { SongSubmissionForm } from '@/components/song-submission-form';
import type { Song } from '@/types';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  updateDocumentNonBlocking,
} from '@/firebase';
import {
  collection,
  serverTimestamp,
  doc,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';
import { EditSongDialog } from '@/components/edit-song-dialog';

export default function StudentPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [editingSong, setEditingSong] = React.useState<Song | null>(null);

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const songsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'song_requests'),
      where('studentId', '==', user.uid)
    );
  }, [firestore, user]);

  const { data: songs, isLoading } = useCollection<Song>(songsQuery);

  const handleSongAdd = async (newSong: { title: string; url: string, name?: string }) => {
    if (!firestore || !user?.displayName) return;

    const studentId = user.uid;
    const studentName = newSong.name || user.displayName;
    const studentDocRef = doc(firestore, 'students', studentId);

    const songRequestDocRef = doc(collection(firestore, 'song_requests'));

    const batch = writeBatch(firestore);

    // Set student document with their name.
    batch.set(studentDocRef, { id: studentId, name: studentName }, { merge: true });

    // Create the new song request
    batch.set(songRequestDocRef, {
      title: newSong.title,
      karaokeUrl: newSong.url,
      id: songRequestDocRef.id,
      studentId: studentId,
      studentName: studentName, // Denormalized name for easier display
      submissionDate: serverTimestamp(),
      status: 'queued',
    });

    try {
      await batch.commit();
    } catch (e) {
      console.error("Error adding song:", e);
    }
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

  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader />
      <main className="space-y-8">
        <SongSubmissionForm onSongAdd={handleSongAdd} studentName={user.displayName || ''} showNameInput={!user.displayName} />
        <SongQueue
          role="student"
          songs={sortedSongs}
          isLoading={isLoading || isUserLoading}
          currentUserId={user?.uid}
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
