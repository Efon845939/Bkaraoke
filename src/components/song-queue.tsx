
'use client';

import * as React from 'react';
import type { Song } from '@/types';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ListMusic,
  MoreHorizontal,
  Pen,
  Trash2,
  Youtube,
  Play,
  Check,
  Pencil,
} from 'lucide-react';

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
};

export function SongQueue({ role, songs, isLoading, currentUserId, onEditSong }: SongQueueProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');

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

  const columns = React.useMemo<ColumnDef<Song>[]>(
    () => [
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const status = row.getValue('status') as Song['status'];
          const variant: 'default' | 'secondary' | 'outline' =
            status === 'playing'
              ? 'default'
              : status === 'queued'
              ? 'secondary'
              : 'outline';
          return (
            <div className="pl-4">
              <Badge
                variant={variant}
                className="w-20 justify-center capitalize shadow-sm"
              >
                {status}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: 'title',
        header: 'Song Title',
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue('title')}</div>
        ),
      },
      {
        accessorKey: 'studentName',
        header: 'Requested By',
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const song = row.original;
          const isOwner = song.studentId === currentUserId;

          if (role === 'admin') {
            return (
              <div className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => window.open(song.karaokeUrl, '_blank')}
                    >
                      <Youtube className="mr-2 h-4 w-4" />
                      <span>Open Link</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditSong(song)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Pen className="mr-2 h-4 w-4" />
                        <span>Change Status</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem
                            onClick={() => updateSongStatus(song.id, 'playing')}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Playing
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => updateSongStatus(song.id, 'played')}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Played
                          </DropdownMenuItem>
                           <DropdownMenuItem
                            onClick={() => updateSongStatus(song.id, 'queued')}
                          >
                            <ListMusic className="mr-2 h-4 w-4" />
                            Queued
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => deleteSong(song.id)}
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          }
          
          if (role === 'student' && isOwner) {
            return (
              <div className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                     <DropdownMenuItem
                      onClick={() => window.open(song.karaokeUrl, '_blank')}
                    >
                      <Youtube className="mr-2 h-4 w-4" />
                      <span>Open Link</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditSong(song)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => deleteSong(song.id)}
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          }

          return null;
        },
      },
    ],
    [role, firestore, toast, currentUserId, onEditSong]
  );

  const table = useReactTable({
    data: songs,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      globalFilter,
    },
    initialState: {
      columnVisibility: {
        studentName: role === 'admin',
        actions: true,
      },
    },
  });

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
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={columns.length} className="py-4">
                       <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    {role === 'admin'
                      ? 'The queue is empty.'
                      : "You haven't requested any songs yet."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
