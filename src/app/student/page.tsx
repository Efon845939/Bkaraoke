
'use client';

import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { SongQueue } from '@/components/song-queue';
import { SongSubmissionForm } from '@/components/song-submission-form';
import { getSongs } from '@/lib/data';
import type { Song } from '@/types';

export default function StudentPage() {
  const [songs, setSongs] = React.useState<Song[]>(() => getSongs());

  const handleSongAdd = (newSong: { title: string; url: string }) => {
    const song: Song = {
      ...newSong,
      id: Date.now().toString(),
      requestedBy: 'You', // In a real app, this would get the user's name from the session
      status: 'queued',
    };
    setSongs((prev) => [song, ...prev]);
  };

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader />
      <main className="space-y-8">
        <SongSubmissionForm onSongAdd={handleSongAdd} />
        <SongQueue role="student" songs={songs} setSongs={setSongs} />
      </main>
    </div>
  );
}
