
'use client';

import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { SongQueue } from '@/components/song-queue';
import { EditSongDialog } from '@/components/edit-song-dialog';
import type { Song } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Trash } from 'lucide-react';

const placeholderSongs: Song[] = [
    {id: '1', title: 'Bohemian Rhapsody', requesterName: 'Freddie', karaokeUrl: 'https://youtube.com', studentId: '', submissionDate: new Date(), order: 0},
    {id: '2', title: 'Livin\' on a Prayer', requesterName: 'Jon', karaokeUrl: 'https://youtube.com', studentId: '', submissionDate: new Date(), order: 1},
    {id: '3', title: 'My Way', requesterName: 'Frank', karaokeUrl: 'https://youtube.com', studentId: '', submissionDate: new Date(), order: 2},
];


export function AdminDashboard() {
  const { toast } = useToast();

  const [songs, setSongs] = React.useState<Song[]>(placeholderSongs);
  const [editingSong, setEditingSong] = React.useState<Song | null>(null);


  const handleReorder = (reorderedSongs: Song[]) => {
    setSongs(reorderedSongs);
     toast({
      title: 'Sıra Yeniden Düzenlendi (Demo)',
      description: 'Bu yalnızca bir demondur, veriler kaydedilmedi.',
    });
  };
  
  const handleSongUpdate = (songId: string, updatedData: { title: string; url: string; }) => {
    setSongs(songs.map(s => s.id === songId ? {...s, title: updatedData.title, karaokeUrl: updatedData.url } : s));
    setEditingSong(null);
     toast({
      title: 'Şarkı Güncellendi (Demo)',
      description: `"${updatedData.title}" güncellendi. (Bu yalnızca bir demondur).`,
    });
  };
  
  const handleClearQueue = () => {
    setSongs([]);
    toast({
        title: 'Sıra Temizlendi! (Demo)',
        description: 'Tüm şarkı istekleri silindi. (Bu yalnızca bir demondur).',
    });
  };
  
  const handleSongDelete = (songId: string) => {
    setSongs(songs.filter(s => s.id !== songId));
     toast({
      title: 'Şarkı Silindi (Demo)',
      description: 'Şarkı silindi. (Bu yalnızca bir demondur).',
    });
  };

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader />
      <main className="space-y-8">
        <div className="flex justify-end">
            <Button variant="destructive" onClick={handleClearQueue} disabled={!songs || songs.length === 0}>
                <Trash className="mr-2 h-4 w-4" />
                Sırayı Temizle
            </Button>
        </div>
        <SongQueue
          songs={songs || []}
          isLoading={false}
          onEditSong={setEditingSong}
          onReorder={handleReorder}
          onDeleteSong={handleSongDelete}
          isAdmin={true}
        />
      </main>
      
      {editingSong && (
        <EditSongDialog
          song={editingSong}
          isOpen={!!editingSong}
          onOpenChange={(isOpen) => !isOpen && setEditingSong(null)}
          onSongUpdate={handleSongUpdate}
        />
      )}
    </div>
  );
}
