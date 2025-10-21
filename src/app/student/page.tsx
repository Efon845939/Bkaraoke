
'use client';

import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { SongQueue } from '@/components/song-queue';
import { SongSubmissionForm } from '@/components/song-submission-form';
import type { Song } from '@/types';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import {
  collection,
  serverTimestamp,
  doc,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';
import { initiateAnonymousSignIn, useAuth } from '@/firebase';

export default function StudentPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  const songsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'song_requests'),
      where('studentId', '==', user.uid)
    );
  }, [firestore, user]);

  const { data: songs, isLoading } = useCollection<Song>(songsQuery);

  const handleSongAdd = async (newSong: { name: string; title: string; url: string }) => {
    if (!firestore || !user) return;

    const studentId = user.uid;
    const studentName = newSong.name;
    const studentDocRef = doc(firestore, 'students', studentId);

    const songRequestDocRef = doc(collection(firestore, 'song_requests'));

    const batch = writeBatch(firestore);

    // Create or update student document with the new name.
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

  const sortedSongs = React.useMemo(() => {
    if (!songs) return [];
    // Convert Firestore Timestamps to JS Dates and sort
    return songs
      .map(song => ({
        ...song,
        submissionDate: (song.submissionDate as any)?.toDate ? (song.submissionDate as any).toDate() : new Date(),
      }))
      .sort((a, b) => {
        const statusOrder = { playing: 0, queued: 1, played: 2 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        return a.submissionDate.getTime() - b.submissionDate.getTime();
      });
  }, [songs]);

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader />
      <main className="space-y-8">
        <SongSubmissionForm onSongAdd={handleSongAdd} />
        <SongQueue
          role="student"
          songs={sortedSongs}
          isLoading={isLoading || isUserLoading}
          currentUserId={user?.uid}
        />
      </main>
    </div>
  );
}
