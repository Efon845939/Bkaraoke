
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

  const [songList, setSongList] = React.useState<Song[]>([]);

  const isAdmin = user?.email?.endsWith('@karaoke.admin.app');

  React.useEffect(() => {
    if (!isUserLoading && !isAdmin) {
      router.push('/');
    }
  }, [user, isUserLoading, router, isAdmin]);

  const songsQuery = useMemoFirebase(() => {
    if (!firestore || !isAdmin) return null;
    return query(collection(firestore, 'song_requests'), orderBy('order'));
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
        <h2 className="mb-4 text-3xl font-headline tracking-wider">Yönetici Paneli - Şarkı Sırası (Salt Okunur)</h2>
        <SongQueue
          role="admin"
          songs={songList}
          isLoading={isLoading && songList.length === 0}
          onEditSong={() => {}} // Admins can't edit
        />
      </main>
    </div>
  );
}
