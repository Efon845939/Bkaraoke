
export type Song = {
  id: string;
  title: string;
  karaokeUrl: string;
  requesterName: string; 
  studentId: string; // Legacy field, always 'anonymous'
  submissionDate: Date;
  order: number;
};
