
export type SongRequest = {
  id: string;
  firstName: string;
  lastName: string;
  songTitle: string;
  songUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: any; // Firestore ServerTimestamp
};
