
export type Song = {
  id: string;
  title: string;
  url: string;
  requestedBy: string;
  status: 'queued' | 'playing' | 'played';
};
