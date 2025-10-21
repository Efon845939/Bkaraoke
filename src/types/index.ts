
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
};
