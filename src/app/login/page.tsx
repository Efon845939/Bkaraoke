
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound } from 'lucide-react';
import { Logo } from '@/components/logo';

const ADMIN_PASSWORD = 'kara90ke';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (password === ADMIN_PASSWORD) {
      toast({
        title: 'Başarılı!',
        description: 'Yönetici paneline yönlendiriliyorsunuz.',
      });
      // Oturum saklama kaldırıldı.
      router.push('/admin');
    } else {
      toast({
        variant: 'destructive',
        title: 'Hata!',
        description: 'Yanlış parola.',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background p-4">
       <header className="sticky top-4 z-10 mb-8 flex items-center justify-between rounded-lg border bg-card/80 p-4 shadow-md backdrop-blur-sm">
        <Link href="/" passHref>
           <Logo />
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center">
        <Card className="w-full max-w-sm">
          <form onSubmit={handleLogin}>
            <CardHeader>
              <CardTitle className="text-2xl">Yönetici Girişi</CardTitle>
              <CardDescription>
                Lütfen yönetici paneline erişmek için parolayı girin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Parola</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10"
                    placeholder="********"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
