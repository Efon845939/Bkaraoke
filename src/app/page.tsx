
'use client';

import * as React from 'react';
import { Logo } from '@/components/logo';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LoginDialog } from '@/components/login-dialog';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [loginRole, setLoginRole] = React.useState<'student' | 'admin' | null>(
    null
  );
  const [authAction, setAuthAction] = React.useState<'login' | 'signup' | null>(null);

  const handleRoleSelect = (role: 'student' | 'admin', action: 'login' | 'signup' | null = 'login') => {
    setLoginRole(role);
    setAuthAction(action);
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
      <Card className="w-full max-w-md animate-in fade-in zoom-in-95 shadow-2xl">
        <CardHeader className="items-center text-center">
          <Logo />
          <p className="pt-2 text-muted-foreground">
            90'lar temalı karaoke yardımcınız
          </p>
        </CardHeader>
        <Separator />
        <CardContent className="flex flex-col gap-4 p-6">
          <h2 className="text-center font-body text-lg font-bold uppercase tracking-widest text-primary/80">
            Rol Seçin
          </h2>
          <div className="grid grid-cols-2 gap-4">
             <Button
                className="w-full"
                size="lg"
                onClick={() => handleRoleSelect('student', 'signup')}
              >
                Öğrenci Kaydı
              </Button>
              <Button
                className="w-full"
                size="lg"
                variant="secondary"
                onClick={() => handleRoleSelect('student', 'login')}
              >
                Öğrenci Girişi
              </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="w-full"
                size="lg"
                onClick={() => handleRoleSelect('admin', 'signup')}
              >
                Yönetici Kaydı
              </Button>
              <Button
                variant="outline"
                className="w-full"
                size="lg"
                onClick={() => handleRoleSelect('admin', 'login')}
              >
                Yönetici Girişi
              </Button>
          </div>
        </CardContent>
      </Card>
      <LoginDialog
            role={loginRole}
            authAction={authAction}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
          />
    </main>
  );
}
