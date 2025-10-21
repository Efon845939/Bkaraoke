
import type { Song } from '@/types';

const songs: Song[] = [
  {
    id: '1',
    title: 'Bohemian Rhapsody',
    url: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
    requestedBy: 'Alex Chen',
    status: 'playing',
  },
  {
    id: '2',
    title: 'I Will Always Love You',
    url: 'https://www.youtube.com/watch?v=3JWTaaS7Lde',
    requestedBy: 'Maria Garcia',
    status: 'queued',
  },
  {
    id: '3',
    title: "Don't Stop Me Now",
    url: 'https://www.youtube.com/watch?v=HgzGwKwLmgM',
    requestedBy: 'Sam Jones',
    status: 'queued',
  },
  {
    id: '4',
    title: 'Livin\' on a Prayer',
    url: 'https://www.youtube.com/watch?v=lDK9gV95_fU',
    requestedBy: 'Casey Lee',
    status: 'queued',
  },
  {
    id: '5',
    title: 'Wannabe',
    url: 'https://www.youtube.com/watch?v=gJLIiF15wjQ',
    requestedBy: 'Jordan Miller',
    status: 'played',
  },
    {
    id: '6',
    title: 'Wonderwall',
    url: 'https://www.youtube.com/watch?v=6hzrDeceEKc',
    requestedBy: 'Taylor Kim',
    status: 'played',
  },
];

export const getSongs = (): Song[] => {
  return songs;
};
