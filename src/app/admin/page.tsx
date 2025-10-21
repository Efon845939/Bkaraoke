
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { SongQueue } from '@/components/song-queue';
import type { Song } from '@/types';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  React.useEffect(() => {
    // If not loading and no user, or user is not the admin, redirect to home
    if (!isUserLoading && (!user || user.uid !== 'admin-account')) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const songsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'song_requests');
  }, [firestore]);

  const { data: songs, isLoading } = useCollection<Song>(songsQuery);

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
  if (isUserLoading || !user || user.uid !== 'admin-account') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading & Verifying Admin Access...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader />
      <main>
        <h2 className="mb-4 text-3xl tracking-wider">Admin Dashboard</h2>
        <SongQueue role="admin" songs={sortedSongs} isLoading={isLoading || isUserLoading} />
      </main>
    </div>
  );
}
