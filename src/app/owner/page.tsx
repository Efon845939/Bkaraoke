
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Separator } from '@/components/ui/separator';

const ownerLoginSchema = z.object({
  firstName: z.string().min(1, 'İsim gerekli').transform(name => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()),
  lastName: z.string().min(1, 'Soyisim gerekli').transform(name => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()),
  pin: z.string().length(4, 'PIN 4 haneli olmalıdır.').regex(/^\d{4}$/, 'PIN sadece rakamlardan oluşmalıdır.'),
  ownerPin: z.string().refine((pin) => pin === 'gizli_kara90ke', {
    message: 'Geçersiz sahip PINi.',
  }),
});

type OwnerLoginFormValues = z.infer<typeof ownerLoginSchema>;

export default function OwnerLoginPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<OwnerLoginFormValues>({
    resolver: zodResolver(ownerLoginSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      pin: '',
      ownerPin: '',
    },
  });
  
  React.useEffect(() => {
    if (!isUserLoading && user && user.email?.endsWith('@karaoke.owner.app')) {
        router.replace('/owner/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async (values: OwnerLoginFormValues) => {
    if (!auth) return;
    setIsLoading(true);

    const { firstName, lastName, pin } = values;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@karaoke.owner.app`;
    const password = `${pin}${firstName}${lastName}`;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: 'Sahip olarak giriş yapıldı!' });
      router.push('/owner/dashboard');
    } catch (error: any) {
      let description = 'Giriş sırasında bir hata oluştu. Bilgilerinizi kontrol edin.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        description = 'Girilen bilgilerle eşleşen bir sahip hesabı bulunamadı.';
      }
      toast({ variant: 'destructive', title: 'Giriş Başarısız', description });
    } finally {
      setIsLoading(false);
    }
  };

  if (isUserLoading || user) {
      return (
          <div className="flex min-h-screen items-center justify-center">
            <p>Yönlendiriliyor...</p>
          </div>
      )
  }

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
            <CardTitle className="pt-4">Sistem Sahibi Girişi</CardTitle>
            <CardDescription>Sistemi yönetmek için giriş yapın.</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İsim</FormLabel>
                    <FormControl><Input placeholder="ör., Efe" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Soyisim</FormLabel>
                    <FormControl><Input placeholder="ör., Küçükvardar" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>4 Haneli Kişisel PIN</FormLabel>
                    <FormControl><Input type="password" maxLength={4} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ownerPin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sahip PIN'i</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full !mt-6">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Giriş Yap'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
