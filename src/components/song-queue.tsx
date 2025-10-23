
'use client';

import * as React from 'react';
import type { Song } from '@/types';
import {
  ListMusic,
  MoreHorizontal,
  Trash2,
  Youtube,
  Pencil,
  GripVertical,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from './ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, collection, serverTimestamp, addDoc, deleteDoc } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';

type SongQueueProps = {
  role: 'student' | 'admin' | 'owner';
  songs: Song[];
  isLoading: boolean;
  currentUserId?: string;
  onEditSong: (song: Song) => void;
  onReorder?: (songs: Song[]) => void;
};

export function SongQueue({
  role,
  songs,
  isLoading,
  currentUserId,
  onEditSong,
  onReorder,
}: SongQueueProps) {
  const [globalFilter, setGlobalFilter] = React.useState('');
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id && onReorder) {
      const oldIndex = songs.findIndex((s) => s.id === active.id);
      const newIndex = songs.findIndex((s) => s.id === over?.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(arrayMove(songs, oldIndex, newIndex));
      }
    }
  };

  const filteredSongs = React.useMemo(() => {
    if (!globalFilter) return songs;
    return songs.filter(
      (song) =>
        song.title.toLowerCase().includes(globalFilter.toLowerCase()) ||
        song.studentName.toLowerCase().includes(globalFilter.toLowerCase())
    );
  }, [songs, globalFilter]);

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <ListMusic />
            {role === 'admin' ? 'Mevcut Sıra' : role === 'owner' ? 'Sıra Yönetimi' : 'İsteklerim'}
          </CardTitle>
          <CardDescription>
            {role === 'admin' ? "Sırada ne olduğunu görün." : "İstediğiniz şarkılar burada."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const canDrag = role === 'owner' && onReorder;

  const tableContent = (
    <Table>
      <TableHeader>
        <TableRow>
          {canDrag && <TableHead className="w-12"></TableHead>}
          <TableHead>Şarkı Başlığı</TableHead>
          {(role === 'admin' || role === 'owner') && <TableHead>İsteyen</TableHead>}
          <TableHead className="text-right">Eylemler</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredSongs.length > 0 ? (
          filteredSongs.map((song) => (
            <SortableSongRow
              key={song.id}
              song={song}
              role={role}
              currentUserId={currentUserId}
              onEditSong={onEditSong}
              canDrag={canDrag}
            />
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={(role === 'admin' || role === 'owner') ? (canDrag ? 4: 3) : 2} className="h-24 text-center">
              {role === 'student' ? "Henüz bir şarkı istemediniz." : 'Sıra boş.'}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <ListMusic />
           {role === 'admin' ? 'Mevcut Sıra' : role === 'owner' ? 'Sıra Yönetimi' : 'İsteklerim'}
        </CardTitle>
        <CardDescription>
          Şarkıları arayın veya sırada ne olduğunu görün.
        </CardDescription>
        <div className="pt-4">
          <Input
            placeholder="Şarkı ara..."
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(String(event.target.value))}
            className="w-full md:w-1/2"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          {canDrag ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredSongs.map(s => s.id)} strategy={verticalListSortingStrategy}>
                {tableContent}
              </SortableContext>
            </DndContext>
          ) : (
            tableContent
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// A new component for the sortable row
const SortableSongRow = ({
  song,
  role,
  currentUserId,
  onEditSong,
  canDrag
}: {
  song: Song;
  role: 'admin' | 'student' | 'owner';
  currentUserId?: string;
  onEditSong: (song: Song) => void;
  canDrag: boolean;
}) => {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id, disabled: !canDrag });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  };
  
  const createAuditLog = (action: string, details: string) => {
    if (!firestore || !user) return;
    const logData = {
      timestamp: serverTimestamp(),
      actorId: user.uid,
      actorName: user.displayName || user.email,
      action,
      details
    };
    addDoc(collection(firestore, 'audit_logs'), logData).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'audit_logs',
            operation: 'create',
            requestResourceData: logData
        }));
    });
  };

  const deleteSong = (id: string, title: string) => {
    if (!firestore) return;
    const songDocRef = doc(firestore, 'song_requests', id);
    deleteDoc(songDocRef).then(() => {
        createAuditLog('SONG_DELETED', `Şarkı: "${title}" (ID: ${id})`);
        toast({
          title: 'Şarkı Kaldırıldı',
          description: `"${title}" sıradan kaldırıldı.`,
          duration: 3000,
        });
    }).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: songDocRef.path,
            operation: 'delete'
        }));
    });
  };

  const isOwnerOfSong = song.studentId === currentUserId;
  const canModify = role === 'owner' || (role === 'student' && isOwnerOfSong);
  
  return (
    <TableRow ref={setNodeRef} style={style}>
      {canDrag && (
        <TableCell className="w-12 cursor-grab touch-none" {...attributes} {...listeners}>
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </TableCell>
      )}
      <TableCell className="font-medium">{song.title}</TableCell>
      {(role === 'admin' || role === 'owner') && <TableCell>{song.studentName}</TableCell>}
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Menüyü aç</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => window.open(song.karaokeUrl, '_blank')}>
              <Youtube className="mr-2 h-4 w-4" />
              <span>Bağlantıyı Aç</span>
            </DropdownMenuItem>
            {canModify && (
              <DropdownMenuItem onClick={() => onEditSong(song)}>
                <Pencil className="mr-2 h-4 w-4" />
                <span>Düzenle</span>
              </DropdownMenuItem>
            )}
            
            {canModify && (
              <>
               {(role === 'owner' || role === 'student') && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  onClick={() => deleteSong(song.id, song.title)}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Sil</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

    