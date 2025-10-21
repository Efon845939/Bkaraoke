
'use client';

import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <style jsx global>{`
        body {
          background-image: radial-gradient(hsl(var(--accent)) 0.5px, transparent 0.5px),
            radial-gradient(hsl(var(--accent)) 0.5px, hsl(var(--background)) 0.5px);
          background-size: 20px 20px;
          background-position: 0 0, 10px 10px;
        }
      `}</style>
      <Card className="w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95">
        <CardHeader className="items-center text-center">
          <Logo />
          <p className="text-muted-foreground pt-2">
            Your 90s-themed karaoke companion
          </p>
        </CardHeader>
        <Separator />
        <CardContent className="flex flex-col gap-4 p-6">
          <h2 className="text-center font-body text-lg font-bold uppercase tracking-widest text-primary/80">
            Select Role
          </h2>
          <Link href="/student" passHref>
            <Button className="w-full" size="lg">
              Enter as Student
            </Button>
          </Link>
          <Link href="/admin" passHref>
            <Button variant="secondary" className="w-full" size="lg">
              Enter as Admin
            </Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
