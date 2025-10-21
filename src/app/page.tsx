
'use client';

import * as React from 'react';
import { Logo } from '@/components/logo';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LoginDialog } from '@/components/login-dialog';

export default function LoginPage() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [loginRole, setLoginRole] = React.useState<'student' | 'admin' | null>(
    null
  );

  const handleRoleSelect = (role: 'student' | 'admin') => {
    setLoginRole(role);
    setDialogOpen(true);
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <style jsx global>{`
        body {
          background-image: radial-gradient(
              hsl(var(--accent)) 0.5px,
              transparent 0.5px
            ),
            radial-gradient(hsl(var(--accent)) 0.5px, hsl(var(--background)) 0.5px);
          background-size: 20px 20px;
          background-position: 0 0, 10px 10px;
        }
      `}</style>
      <Card className="w-full max-w-sm animate-in fade-in zoom-in-95 shadow-2xl">
        <CardHeader className="items-center text-center">
          <Logo />
          <p className="pt-2 text-muted-foreground">
            Your 90s-themed karaoke companion
          </p>
        </CardHeader>
        <Separator />
        <CardContent className="flex flex-col gap-4 p-6">
          <h2 className="text-center font-body text-lg font-bold uppercase tracking-widest text-primary/80">
            Select Role
          </h2>
          <LoginDialog
            role={loginRole}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onRoleSelect={handleRoleSelect}
          />
        </CardContent>
      </Card>
    </main>
  );
}
