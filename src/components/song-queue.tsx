
'use client';

import * as React from 'react';
import type { Song } from '@/types';
import {
  ListMusic,
  MoreHorizontal,
  Youtube,
  Pencil,
  GripVertical,
  Trash2,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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
import { Skeleton } from './ui/skeleton';

type SongQueueProps = {
  songs: Song[];
  isLoading: boolean;
  isAdmin: boolean;
  onEditSong: (song: Song) => void;
  onReorder?: (songs: Song[]) => void;
  onDeleteSong?: (songId: string) => void;
};

export function SongQueue({
  songs,
  isLoading,
  isAdmin,
  onEditSong,
  onReorder,
  onDeleteSong,
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
        song.requesterName.toLowerCase().includes(globalFilter.toLowerCase())
    );
  }, [songs, globalFilter]);

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <ListMusic />
            Mevcut Sıra
          </CardTitle>
          <CardDescription>
            Sırada ne olduğunu görün.
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
  
  const canDrag = isAdmin && !!onReorder;

  const tableContent = (
    <Table>
      <TableHeader>
        <TableRow>
          {canDrag && <TableHead className="w-12"></TableHead>}
          <TableHead>Şarkı Başlığı</TableHead>
          <TableHead>İsteyen</TableHead>
          <TableHead className="text-right">Eylemler</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredSongs.length > 0 ? (
          filteredSongs.map((song) => (
            <SortableSongRow
              key={song.id}
              song={song}
              isAdmin={isAdmin}
              onEditSong={onEditSong}
              onDeleteSong={onDeleteSong}
              canDrag={canDrag}
            />
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={isAdmin ? 4 : 3} className="h-24 text-center">
              Sıra boş.
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
           Mevcut Sıra
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

const SortableSongRow = ({
  song,
  isAdmin,
  onEditSong,
  onDeleteSong,
  canDrag
}: {
  song: Song;
  isAdmin: boolean;
  onEditSong: (song: Song) => void;
  onDeleteSong?: (songId: string) => void;
  canDrag: boolean;
}) => {

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
  
  return (
    <TableRow ref={setNodeRef} style={style}>
      {canDrag && (
        <TableCell className="w-12 cursor-grab touch-none" {...attributes} {...listeners}>
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </TableCell>
      )}
      <TableCell className="font-medium">{song.title}</TableCell>
      <TableCell>{song.requesterName}</TableCell>
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
            {isAdmin && (
              <>
                <DropdownMenuItem onClick={() => onEditSong(song)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  <span>Düzenle</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Sil</span>
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Bu eylem geri alınamaz. Bu şarkı isteğini kalıcı olarak silecektir.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>İptal</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDeleteSong?.(song.id)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Sil
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};
