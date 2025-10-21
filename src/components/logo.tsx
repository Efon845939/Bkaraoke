
import { CassetteTape } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <CassetteTape className="h-8 w-8 text-primary" />
      <h1 className="text-3xl font-headline tracking-wider text-primary">
        Karaoke Sırası
      </h1>
    </div>
  );
}
