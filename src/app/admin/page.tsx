
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { SongQueue } from '@/components/song-queue';
import { SongSubmissionForm } from '@/components/song-submission-form';
import type { Song } from '@/types';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // Check for admin status by email, which is stable.
  const isAdmin = user?.email === 'admin@karaoke.app';

  React.useEffect(() => {
    // If auth is no longer loading and the user is not an admin, redirect.
    if (!isUserLoading && !isAdmin) {
      router.push('/');
    }
  }, [user, isUserLoading, router, isAdmin]);

  const songsQuery = useMemoFirebase(() => {
    if (!firestore || !isAdmin) return null; // Only query if user is an admin
    return collection(firestore, 'song_requests');
  }, [firestore, isAdmin]);

  const { data: songs, isLoading } = useCollection<Song>(songsQuery);

  const handleSongAdd = async (newSong: { title: string; url: string; name?: string }) => {
    if (!firestore || !user) return;

    // Use the name from the form, or default to "Admin" if not provided
    const requesterName = newSong.name || 'Admin';

    // The studentId for all admin-added songs will be the admin user's UID
    const studentId = user.uid;

    const studentDocRef = doc(firestore, 'students', studentId);
    const songRequestDocRef = doc(collection(firestore, 'song_requests'));

    const batch = writeBatch(firestore);

    // Set a student document for the admin user if it doesn't exist.
    // The name here is a fallback; the important one is on the song request.
    batch.set(studentDocRef, { id: studentId, name: 'Admin User' }, { merge: true });

    // Create the new song request
    batch.set(songRequestDocRef, {
      title: newSong.title,
      karaokeUrl: newSong.url,
      id: songRequestDocRef.id,
      studentId: studentId,
      studentName: requesterName, // Use the name from the form
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

  // Render a loading state while checking for user auth
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
        <SongQueue role="admin" songs={sortedSongs} isLoading={isLoading || isUserLoading} />
      </main>
    </div>
  );
}
