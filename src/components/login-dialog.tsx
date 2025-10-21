
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { useAuth } from '@/firebase';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const studentSchema = z.object({
  firstName: z
    .string()
    .min(1, 'İsim gerekli')
    .transform(
      (name) => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
    ),
  lastName: z
    .string()
    .min(1, 'Soyisim gerekli')
    .transform(
      (name) => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
    ),
  pin: z.string().length(4, 'PIN 4 haneli olmalıdır.').regex(/^\d{4}$/, 'PIN sadece rakamlardan oluşmalıdır.'),
});

const adminSchema = z.object({
  pin: z.string().refine((pin) => pin === 'kara90ke', {
    message: 'Geçersiz yönetici PINi.',
  }),
});

type LoginDialogProps = {
  role: 'student' | 'admin' | null;
  authAction: 'login' | 'signup' | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LoginDialog({
  role,
  authAction,
  open,
  onOpenChange,
}: LoginDialogProps) {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const formSchema = role === 'student' ? studentSchema : adminSchema;
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      pin: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({ firstName: '', lastName: '', pin: '' });
    }
  }, [role, authAction, open, form]);

  const handleStudentSignUp = async (values: z.infer<typeof studentSchema>) => {
    if (!auth) return;
    setIsLoading(true);
    const { firstName, lastName, pin } = values;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@karaoke.app`;
    const password = `${pin}${firstName}${lastName}`;

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await updateProfile(userCredential.user, {
        displayName: `${firstName} ${lastName}`,
      });
      toast({ title: 'Hesap oluşturuldu!', description: 'Hoş geldiniz! Yeni hesabınız hazır.', duration: 3000 });
      router.push('/student');
    } catch (signUpError: any) {
      if (signUpError.code === 'auth/email-already-in-use') {
        toast({
          variant: 'destructive',
          title: 'Kayıt başarısız',
          description: 'Bu isimle bir hesap zaten mevcut. Lütfen giriş yapın.',
          duration: 3000,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Kayıt başarısız',
          description: signUpError.message,
          duration: 3000,
        });
      }
    } finally {
      setIsLoading(false);
      onOpenChange(false);
    }
  };

  const handleStudentSignIn = async (values: z.infer<typeof studentSchema>) => {
    if (!auth) return;
    setIsLoading(true);
    const { firstName, lastName, pin } = values;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@karaoke.app`;
    const password = `${pin}${firstName}${lastName}`;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: 'Tekrar hoş geldiniz!', duration: 3000 });
      router.push('/student');
    } catch (signInError: any) {
      if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
        toast({
          variant: 'destructive',
          title: 'Giriş başarısız',
          description: 'Geçersiz isim veya PIN. Lütfen tekrar deneyin.',
          duration: 3000,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Giriş başarısız',
          description: signInError.message,
          duration: 3000,
        });
      }
    } finally {
      setIsLoading(false);
      onOpenChange(false);
    }
  };

  const handleAdminLogin = async (values: z.infer<typeof adminSchema>) => {
    if (!auth) return;
    setIsLoading(true);
    const adminEmail = 'admin@karaoke.app';
    const adminPassword = 'supersecretadminpassword';

    try {
      await signOut(auth);
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      router.push('/admin');
    } catch (error: any) {
       if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
           await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
           await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
          router.push('/admin');
        } catch (creationError: any) {
           toast({ variant: 'destructive', title: 'Yönetici kurulumu başarısız', description: creationError.message, duration: 3000 });
        }
      } else {
        toast({ variant: 'destructive', title: 'Yönetici girişi başarısız', description: error.message, duration: 3000 });
      }
    } finally {
      setIsLoading(false);
      onOpenChange(false);
    }
  };

  const getDialogContent = () => {
    if (role === 'admin') {
      return {
        title: 'Yönetici Girişi',
        description: 'Panele erişmek için yönetici PIN\'ini girin.',
        handler: handleAdminLogin,
        buttonText: 'Giriş Yap'
      };
    }
    if (role === 'student') {
      if (authAction === 'signup') {
        return {
          title: 'Öğrenci Hesabı Oluştur',
          description: 'Hesap oluşturmak için adınızı ve 4 haneli bir PIN girin.',
          handler: handleStudentSignUp,
          buttonText: 'Kayıt Ol'
        };
      }
      return {
        title: 'Öğrenci Girişi',
        description: 'Şarkı listenize erişmek için adınızı ve PIN\'inizi girin.',
        handler: handleStudentSignIn,
        buttonText: 'Giriş Yap'
      };
    }
    return { title: '', description: '', handler: async () => {}, buttonText: '' };
  };

  const { title, description, handler, buttonText } = getDialogContent();

  return (
    <Dialog open={open && !!role} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handler as any)} className="space-y-4">
            {role === 'student' && (
              <>
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>İsim</FormLabel>
                      <FormControl>
                        <Input placeholder="ör., Jane" {...field} />
                      </FormControl>
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
                      <FormControl>
                        <Input placeholder="ör., Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            <FormField
              control={form.control}
              name="pin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{role === 'student' ? '4 Haneli PIN' : 'Yönetici PIN\'i'}</FormLabel>
                  <FormControl>
                    <Input type="password" maxLength={role === 'student' ? 4 : undefined} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  buttonText
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
