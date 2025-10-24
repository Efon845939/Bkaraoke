
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { SongQueue } from '@/components/song-queue';
import type { Song } from '@/types';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { buildSongRequestsQuery, type Roles } from '@/lib/firestore-guards';

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const roles: Roles = React.useMemo(() => {
    if (!user?.email) return { isOwner: false, isAdmin: false, isParticipant: false };
    const email = user.email.toLowerCase();
    return {
        isOwner: /@karaoke\.owner\.app$/.test(email),
        isAdmin: /@karaoke\.admin\.app$/.test(email),
        isParticipant: /@karaoke\.app$/.test(email),
    };
  }, [user]);

  React.useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.replace('/');
    } else if (!roles.isAdmin && !roles.isOwner) { // Owner'lar da admin paneline girebilir
      router.replace('/participant'); // Admin veya Owner olmayanları yönlendir
    }
  }, [user, isUserLoading, router, roles]);

  const songsQuery = useMemoFirebase(() => {
    // Merkezi guard fonksiyonu çağrılıyor.
    // Bu fonksiyon, roller ve kullanıcı durumu uygun değilse null döner.
    // Sorgunun yalnızca admin veya owner rolüne sahip kullanıcılar için oluşturulduğundan emin olunur.
    if (!firestore || !user || (!roles.isAdmin && !roles.isOwner)) {
      return null;
    }
    return buildSongRequestsQuery(firestore, user, roles);
  }, [firestore, user, roles]);

  const { data: songs, isLoading } = useCollection<Song>(songsQuery);

  // Auth durumu netleşene veya kullanıcı doğru role sahip olana kadar render etme.
  if (isUserLoading || !user || (!roles.isAdmin && !roles.isOwner)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Yönetici Erişimi Yükleniyor ve Doğrulanıyor...</p>
      </div>
    );
  }

  // Bu noktada, kullanıcının admin veya owner olduğu ve sorgunun güvenli olduğu doğrulanmıştır.
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
