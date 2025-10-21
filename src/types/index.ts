
export type Song = {
  id: string;
  title: string;
  karaokeUrl: string;
  studentName: string; // Denormalized for display
  studentId: string;
  status: 'queued' | 'playing' | 'played';
  submissionDate: Date;
  order: number;
};

export type Student = {
  id: string;
  name: string;
  role: 'student' | 'admin' | 'owner';
};

export type AuditLog = {
    id: string;
    timestamp: Date;
    actorId: string;
    actorName: string;
    action: string; // e.g., 'SONG_ADDED', 'USER_DELETED'
    details: string; // e.g., 'Song "Bohemian Rhapsody" was added by John Doe'
}
