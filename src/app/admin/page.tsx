
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { SongQueue } from '@/components/song-queue';
import type { Song } from '@/types';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const isAdmin = React.useMemo(() => {
    if (!user?.email) return false;
    return /@karaoke\.admin\.app$/i.test(user.email);
  }, [user]);

  React.useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.replace('/');
    } else if (!isAdmin) {
      router.replace('/participant'); // Redirect non-admins
    }
  }, [user, isUserLoading, router, isAdmin]);

  const songsQuery = useMemoFirebase(() => {
    // CRITICAL: Only create the query if we have a firestore instance AND the user is a confirmed admin.
    // This prevents a non-admin user who lands on this page from attempting to fetch all songs.
    if (!firestore || !isAdmin) return null;
    return query(collection(firestore, 'song_requests'), orderBy('order', 'asc'));
  }, [firestore, isAdmin]);

  const { data: songs, isLoading } = useCollection<Song>(songsQuery);

  // Render a loading/unauthorized state UNTIL the user is confirmed to be an admin.
  // This prevents the SongQueue from being mounted with a null query while waiting for auth.
  if (isUserLoading || !user || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Yönetici Erişimi Yükleniyor ve Doğrulanıyor...</p>
      </div>
    );
  }

  // By this point, we know the user is an admin, and the query can be safely executed.
  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader />
      <main className="space-y-8">
        <h2 className="mb-4 text-3xl font-headline tracking-wider">Yönetici Paneli - Şarkı Sırası</h2>
        <SongQueue
          role="admin"
          songs={songs || []}
          isLoading={isLoading}
          onEditSong={() => {}} // Admins can't edit
        />
      </main>
    </div>
  );
}
