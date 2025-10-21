
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
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth, useFirestore, addDocumentNonBlocking } from '@/firebase';

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
import { serverTimestamp } from 'firebase/firestore';

const studentSchema = z.object({
  firstName: z.string().min(1, 'İsim gerekli').transform(name => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()),
  lastName: z.string().min(1, 'Soyisim gerekli').transform(name => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()),
  pin: z.string().length(4, 'PIN 4 haneli olmalıdır.').regex(/^\d{4}$/, 'PIN sadece rakamlardan oluşmalıdır.'),
});

const adminSchema = studentSchema.extend({
  adminPin: z.string().refine((pin) => pin === 'kara90ke' || pin === 'gizli_kara90ke', {
    message: 'Geçersiz yönetici/sahip PINi.',
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
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const formSchema = role === 'admin' ? adminSchema : studentSchema;
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      pin: '',
      adminPin: '',
    } as any,
  });

  React.useEffect(() => {
    if (open) {
      form.reset({ firstName: '', lastName: '', pin: '', adminPin: '' });
    }
  }, [role, authAction, open, form]);

  const createAuditLog = (actorId: string, actorName: string, action: string, details: string) => {
    if (!firestore) return;
    addDocumentNonBlocking(collection(firestore, 'audit_logs'), {
      timestamp: serverTimestamp(),
      actorId,
      actorName,
      action,
      details
    });
  };

  const handleAuth = async (values: FormValues) => {
    if (!auth || !firestore) return;
    setIsLoading(true);

    const { firstName, lastName, pin } = values;
    const isAdmin = role === 'admin';
    const isOwnerLogin = isAdmin && 'adminPin' in values && values.adminPin === 'gizli_kara90ke';
    
    const emailDomain = isOwnerLogin ? '@karaoke.owner.app' : isAdmin ? '@karaoke.admin.app' : '@karaoke.app';
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${emailDomain}`;
    const password = `${pin}${firstName}${lastName}`;
    const displayName = `${firstName} ${lastName}`;
    
    try {
        let userCredential;
        if (authAction === 'signup') {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName });
            
            const userRole = isOwnerLogin ? 'owner' : isAdmin ? 'admin' : 'student';
            await setDoc(doc(firestore, 'students', userCredential.user.uid), {
                id: userCredential.user.uid,
                name: displayName,
                role: userRole
            });
            createAuditLog(userCredential.user.uid, displayName, 'USER_SIGNUP', `Rol: ${userRole}`);
            toast({ title: 'Hesap oluşturuldu!', description: 'Hoş geldiniz! Yeni hesabınız hazır.' });
        } else { // Login
            userCredential = await signInWithEmailAndPassword(auth, email, password);
            toast({ title: 'Tekrar hoş geldiniz!' });
        }

        if (isOwnerLogin) {
            router.push('/owner');
        } else if (isAdmin) {
            router.push('/admin');
        } else {
            router.push('/student');
        }

    } catch (error: any) {
        let title = 'Hata';
        let description = 'Bilinmeyen bir hata oluştu.';

        if (error.code === 'auth/email-already-in-use') {
            title = 'Kayıt başarısız';
            description = 'Bu isimle bir hesap zaten mevcut. Lütfen giriş yapın veya farklı bir isim deneyin.';
        } else if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            title = 'Giriş başarısız';
            description = 'Girilen bilgilerle eşleşen bir kullanıcı bulunamadı. Lütfen bilgilerinizi kontrol edin veya kayıt olun.';
        } else {
            description = error.message;
        }

        toast({ variant: 'destructive', title, description, duration: 4000 });
    } finally {
        setIsLoading(false);
        onOpenChange(false);
    }
  };

  const getDialogContent = () => {
    const isSignup = authAction === 'signup';
    if (role === 'admin') {
      return {
        title: isSignup ? 'Yönetici Hesabı Oluştur' : 'Yönetici Girişi',
        description: isSignup ? 'Yönetici olmak için bilgilerinizi ve yönetici PIN\'ini girin.' : 'Panele erişmek için yönetici bilgilerinizi girin.',
        handler: handleAuth,
        buttonText: isSignup ? 'Kayıt Ol' : 'Giriş Yap'
      };
    }
    if (role === 'student') {
      return {
        title: isSignup ? 'Öğrenci Hesabı Oluştur' : 'Öğrenci Girişi',
        description: isSignup ? 'Hesap oluşturmak için adınızı ve 4 haneli bir PIN girin.' : 'Şarkı listenize erişmek için adınızı ve PIN\'inizi girin.',
        handler: handleAuth,
        buttonText: isSignup ? 'Kayıt Ol' : 'Giriş Yap'
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
          <form onSubmit={form.handleSubmit(handler)} className="space-y-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>İsim</FormLabel>
                  <FormControl>
                    <Input placeholder="ör., Ahmet" {...field} />
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
                    <Input placeholder="ör., Yılmaz" {...field} />
                  </FormControl>
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
                  <FormControl>
                    <Input type="password" maxLength={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {role === 'admin' && (
              <FormField
                control={form.control}
                name="adminPin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yönetici/Sahip PIN'i</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : buttonText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
