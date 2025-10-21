
'use client';

import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { SongQueue } from '@/components/song-queue';
import { getSongs } from '@/lib/data';
import type { Song } from '@/types';

export default function AdminPage() {
  const [songs, setSongs] = React.useState<Song[]>(() => getSongs());

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader />
      <main>
        <h2 className="text-3xl tracking-wider mb-4">Admin Dashboard</h2>
        <SongQueue role="admin" songs={songs} setSongs={setSongs} />
      </main>
    </div>
  );
}
