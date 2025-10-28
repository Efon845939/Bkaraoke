
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { SongQueue } from '@/components/song-queue';
import { SongSubmissionForm } from '@/components/song-submission-form';
import type { Song } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

const placeholderSongs: Song[] = [
    {id: '1', title: 'Bohemian Rhapsody', requesterName: 'Freddie', karaokeUrl: '', studentId: '', submissionDate: new Date(), order: 0},
    {id: '2', title: 'Livin\' on a Prayer', requesterName: 'Jon', karaokeUrl: '', studentId: '', submissionDate: new Date(), order: 1},
    {id: '3', title: 'My Way', requesterName: 'Frank', karaokeUrl: '', studentId: '', submissionDate: new Date(), order: 2},
];


export default function PublicPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleSongAdd = (newSong: { title: string; url: string; name: string }) => {
    toast({
      title: 'İstek Gönderildi!',
      description: `"${newSong.title}" sıraya eklendi. (Bu yalnızca bir demondur, veriler kaydedilmedi).`,
      duration: 3000,
    });
  };

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-8">
       <header className="sticky top-4 z-10 mb-8 flex items-center justify-between rounded-lg border bg-card/80 p-4 shadow-md backdrop-blur-sm">
        <h1 className="text-3xl font-headline tracking-wider text-primary">Karaoke Sırası</h1>
        <Button onClick={() => router.push('/admin')}>Yönetici Paneli</Button>
      </header>
      <main className="space-y-8">
        <SongSubmissionForm onSongAdd={handleSongAdd} showNameInput={true} />
        <SongQueue
          songs={placeholderSongs}
          isLoading={false}
          onEditSong={() => {}}
          isAdmin={false}
        />
      </main>
    </div>
  );
}
