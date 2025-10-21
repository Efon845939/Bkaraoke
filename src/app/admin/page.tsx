
'use client';

import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { SongQueue } from '@/components/song-queue';
import type { Song } from '@/types';
import { useFirestore, useCollection, useMemoFirebase, useUser, useAuth, initiateAnonymousSignIn } from '@/firebase';
import { collection } from 'firebase/firestore';

export default function AdminPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);


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

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader />
      <main>
        <h2 className="text-3xl tracking-wider mb-4">Admin Dashboard</h2>
        <SongQueue role="admin" songs={sortedSongs} isLoading={isLoading || isUserLoading} />
      </main>
    </div>
  );
}
