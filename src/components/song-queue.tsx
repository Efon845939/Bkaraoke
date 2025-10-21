
'use client';

import * as React from 'react';
import type { Song } from '@/types';
import {
  ListMusic,
  MoreHorizontal,
  Pen,
  Trash2,
  Youtube,
  Play,
  Check,
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
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
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from './ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';

type SongQueueProps = {
  role: 'student' | 'admin';
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
            {role === 'admin' ? 'Current Queue' : 'My Requests'}
          </CardTitle>
          <CardDescription>
            {role === 'admin'
              ? "Search for songs or see what's up next."
              : "Here are the songs you've requested."}
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
  
  const dndContent = (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={filteredSongs.map(s => s.id)} strategy={verticalListSortingStrategy}>
        <Table>
          <TableHeader>
            <TableRow>
              {role === 'admin' && <TableHead className="w-12"></TableHead>}
              <TableHead>Status</TableHead>
              <TableHead>Song Title</TableHead>
              {role === 'admin' && <TableHead>Requested By</TableHead>}
              <TableHead className="text-right">Actions</TableHead>
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
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={role === 'admin' ? 5 : 4} className="h-24 text-center">
                  {role === 'admin'
                    ? 'The queue is empty.'
                    : "You haven't requested any songs yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </SortableContext>
    </DndContext>
  );

  const regularContent = (
     <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Song Title</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  You haven't requested any songs yet.
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
          {role === 'admin' ? 'Current Queue' : 'My Requests'}
        </CardTitle>
        <CardDescription>
          {role === 'admin'
            ? "Search for songs or see what's up next."
            : "Here are the songs you've requested."}
        </CardDescription>
        <div className="pt-4">
          <Input
            placeholder="Search songs..."
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(String(event.target.value))}
            className="w-full md:w-1/2"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          {role === 'admin' ? dndContent : regularContent}
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
}: {
  song: Song;
  role: 'admin' | 'student';
  currentUserId?: string;
  onEditSong: (song: Song) => void;
}) => {
  const { toast } = useToast();
  const firestore = useFirestore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id, disabled: role !== 'admin' });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  const deleteSong = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'song_requests', id));
    toast({
      title: 'Song Removed',
      description: 'The song has been removed from the queue.',
    });
  };

  const updateSongStatus = (id: string, status: Song['status']) => {
    if (!firestore) return;
    updateDocumentNonBlocking(doc(firestore, 'song_requests', id), { status });
    toast({
      title: 'Status Updated',
      description: `The song status has been updated to "${status}".`,
    });
  };

  const status = song.status;
  const badgeVariant: 'default' | 'secondary' | 'outline' =
    status === 'playing'
      ? 'default'
      : status === 'queued'
      ? 'secondary'
      : 'outline';
  const isOwner = song.studentId === currentUserId;

  return (
    <TableRow ref={setNodeRef} style={style}>
      {role === 'admin' && (
        <TableCell className="w-12 cursor-grab touch-none" {...attributes} {...listeners}>
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </TableCell>
      )}
      <TableCell>
        <Badge variant={badgeVariant} className="w-20 justify-center capitalize shadow-sm">
          {status}
        </Badge>
      </TableCell>
      <TableCell className="font-medium">{song.title}</TableCell>
      {role === 'admin' && <TableCell>{song.studentName}</TableCell>}
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => window.open(song.karaokeUrl, '_blank')}>
              <Youtube className="mr-2 h-4 w-4" />
              <span>Open Link</span>
            </DropdownMenuItem>
            {(role === 'admin' || isOwner) && (
              <DropdownMenuItem onClick={() => onEditSong(song)}>
                <Pencil className="mr-2 h-4 w-4" />
                <span>Edit</span>
              </DropdownMenuItem>
            )}
            {role === 'admin' && (
              <>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Pen className="mr-2 h-4 w-4" />
                    <span>Change Status</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => updateSongStatus(song.id, 'playing')}>
                        <Play className="mr-2 h-4 w-4" />
                        Playing
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateSongStatus(song.id, 'played')}>
                        <Check className="mr-2 h-4 w-4" />
                        Played
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateSongStatus(song.id, 'queued')}>
                        <ListMusic className="mr-2 h-4 w-4" />
                        Queued
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
              </>
            )}
            {(role === 'admin' || isOwner) && (
              <>
               {role === 'student' && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  onClick={() => deleteSong(song.id)}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};
