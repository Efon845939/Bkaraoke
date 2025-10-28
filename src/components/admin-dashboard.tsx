
'use client';

import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { SongQueue } from '@/components/song-queue';
import { EditSongDialog } from '@/components/edit-song-dialog';
import type { Song } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Trash } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, onSnapshot, doc, writeBatch, updateDoc, deleteDoc } from 'firebase/firestore';

export function AdminDashboard() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [songs, setSongs] = React.useState<Song[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [editingSong, setEditingSong] = React.useState<Song | null>(null);

  React.useEffect(() => {
    if (!firestore) return;
    setIsLoading(true);
    const songsCollection = collection(firestore, 'song_requests');
    const q = query(songsCollection, orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const songList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submissionDate: doc.data().submissionDate?.toDate()
      } as Song));
      setSongs(songList);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching songs:", error);
      toast({
        variant: "destructive",
        title: "Hata!",
        description: "Şarkı listesi yüklenemedi.",
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, toast]);


  const handleReorder = async (reorderedSongs: Song[]) => {
    if (!firestore) return;
    setSongs(reorderedSongs); 
    
    try {
      const batch = writeBatch(firestore);
      reorderedSongs.forEach((song, index) => {
        const songRef = doc(firestore, 'song_requests', song.id);
        batch.update(songRef, { order: index });
      });
      await batch.commit();
      toast({
        title: 'Sıra Yeniden Düzenlendi',
        description: 'Şarkı sırası başarıyla güncellendi.',
      });
    } catch (error) {
      console.error("Error reordering songs:", error);
      toast({
        variant: "destructive",
        title: "Hata!",
        description: "Sıra güncellenirken bir sorun oluştu.",
      });
    }
  };
  
  const handleSongUpdate = async (songId: string, updatedData: { title: string; url: string; }) => {
    if (!firestore) return;
    try {
        const songRef = doc(firestore, 'song_requests', songId);
        await updateDoc(songRef, { title: updatedData.title, karaokeUrl: updatedData.url });
        setEditingSong(null);
        toast({
            title: 'Şarkı Güncellendi!',
            description: `"${updatedData.title}" başarıyla güncellendi.`,
        });
    } catch (error) {
        console.error("Error updating song:", error);
        toast({
            variant: "destructive",
            title: "Hata!",
            description: "Şarkı güncellenirken bir sorun oluştu.",
        });
    }
  };
  
  const handleClearQueue = async () => {
    if (!firestore || songs.length === 0) return;
    try {
        const batch = writeBatch(firestore);
        songs.forEach(song => {
            const songRef = doc(firestore, 'song_requests', song.id);
            batch.delete(songRef);
        });
        await batch.commit();
        toast({
            title: 'Sıra Temizlendi!',
            description: 'Tüm şarkı istekleri silindi.',
        });
    } catch(error) {
        console.error("Error clearing queue:", error);
        toast({
            variant: "destructive",
            title: "Hata!",
            description: "Sıra temizlenirken bir sorun oluştu.",
        });
    }
  };
  
  const handleSongDelete = async (songId: string) => {
    if (!firestore) return;
    try {
        await deleteDoc(doc(firestore, 'song_requests', songId));
        toast({
            title: 'Şarkı Silindi',
            description: 'Şarkı başarıyla sıradan kaldırıldı.',
        });
    } catch (error) {
        console.error("Error deleting song:", error);
        toast({
            variant: "destructive",
            title: "Hata!",
            description: "Şarkı silinirken bir sorun oluştu.",
        });
    }
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
          isLoading={isLoading}
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
