
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
} from 'lucide-react';

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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { useToast } from '@/hooks/use-toast';

type SongQueueProps = {
  role: 'student' | 'admin';
  songs: Song[];
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
};

export function SongQueue({ role, songs, setSongs }: SongQueueProps) {
  const { toast } = useToast();
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'status', desc: false },
  ]);
  const [globalFilter, setGlobalFilter] = React.useState('');

  const deleteSong = (id: string) => {
    setSongs((prev) => prev.filter((song) => song.id !== id));
    toast({
      title: 'Song Removed',
      description: 'The song has been removed from the queue.',
      variant: 'destructive',
    });
  };

  const columns = React.useMemo<ColumnDef<Song>[]>(() => [
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
            <Badge variant={variant} className="capitalize w-20 justify-center shadow-sm">
              {status}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: 'title',
      header: 'Song Title',
      cell: ({ row }) => <div className="font-medium">{row.getValue('title')}</div>,
    },
    {
      accessorKey: 'requestedBy',
      header: 'Requested By',
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const song = row.original;
        if (role !== 'admin') return null;

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
                <DropdownMenuItem onClick={() => window.open(song.url, '_blank')}>
                  <Youtube className="mr-2 h-4 w-4" />
                  <span>Open Link</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => alert(`Editing is a future feature!`)}>
                  <Pen className="mr-2 h-4 w-4" />
                  <span>Edit</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => deleteSong(song.id)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ], [role, setSongs, toast]);

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
            requestedBy: role === 'admin',
            actions: role === 'admin'
        }
    }
  });

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <ListMusic />
          Current Queue
        </CardTitle>
        <CardDescription>Search for songs or see what's up next.</CardDescription>
        <div className="pt-4">
          <Input
            placeholder="Search songs in the queue..."
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
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    The queue is empty. Go ahead and add a song!
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
