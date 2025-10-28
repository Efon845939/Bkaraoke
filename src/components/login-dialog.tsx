
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
import { doc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { useAuth, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const participantSchema = z.object({
  firstName: z.string().min(1, 'İsim gerekli').transform(name => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()),
  lastName: z.string().min(1, 'Soyisim gerekli').transform(name => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()),
  pin: z.string().length(4, 'PIN 4 haneli olmalıdır.').regex(/^\d{4}$/, 'PIN sadece rakamlardan oluşmalıdır.'),
});

const adminSchema = participantSchema.extend({
  adminPin: z.string().refine((pin) => pin === 'kara90ke', {
    message: 'Geçersiz yönetici PINi.',
  }),
});

type LoginDialogProps = {
  role: 'participant' | 'admin' | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LoginDialog({
  role,
  open,
  onOpenChange,
}: LoginDialogProps) {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [authAction, setAuthAction] = React.useState<'login' | 'signup'>('login');

  const formSchema = role === 'admin' ? adminSchema : participantSchema;
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
      setAuthAction('login');
    }
  }, [role, open, form]);

  const createAuditLog = (actorId: string, actorName: string, action: string, details: string) => {
    if (!firestore) return;
    const logData = {
        timestamp: serverTimestamp(),
        actorId,
        actorName,
        action,
        details
    };
    addDoc(collection(firestore, 'audit_logs'), logData).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'audit_logs',
            operation: 'create',
            requestResourceData: logData
        }));
    });
  };

  const handleAuth = async (values: FormValues) => {
    if (!auth || !firestore) return;
    setIsLoading(true);

    const { firstName, lastName, pin } = values;
    const isAdmin = role === 'admin';
    
    const emailDomain = isAdmin ? '@karaoke.admin.app' : '@karaoke.app';
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${emailDomain}`;
    const password = `${pin}${firstName}${lastName}`;
    const displayName = `${firstName} ${lastName}`;
    
    try {
        let userCredential;
        if (authAction === 'signup') {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName });
            
            const userRole = isAdmin ? 'admin' : 'student';
            const userDocRef = doc(firestore, 'students', userCredential.user.uid);
            const userProfileData = {
                id: userCredential.user.uid,
                name: displayName,
                role: userRole
            };

            // Use setDoc to create the document with a specific ID (the user's UID)
            setDoc(userDocRef, userProfileData).catch(e => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'create',
                    requestResourceData: userProfileData
                }));
            });

            createAuditLog(userCredential.user.uid, displayName, 'USER_SIGNUP', `Rol: ${userRole}`);
            toast({ title: 'Hesap oluşturuldu!', description: 'Hoş geldiniz! Yeni hesabınız hazır.' });
        } else { // Login
            userCredential = await signInWithEmailAndPassword(auth, email, password);
            toast({ title: 'Tekrar hoş geldiniz!' });
        }

        if (isAdmin) {
            router.push('/admin');
        } else {
            router.push('/participant');
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
    if (role === 'admin') {
      return {
        title: 'Yönetici Alanı',
        description: 'Panele erişmek için yönetici bilgilerinizi girin.',
      };
    }
    if (role === 'participant') {
      return {
        title: 'Katılımcı Alanı',
        description: 'Şarkı istemek için giriş yapın veya yeni hesap oluşturun.',
      };
    }
    return { title: '', description: '' };
  };
  
  const { title, description } = getDialogContent();
  const buttonText = authAction === 'signup' ? 'Hesap Oluştur' : 'Giriş Yap';

  return (
    <Dialog open={open && !!role} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Tabs value={authAction} onValueChange={(value) => setAuthAction(value as 'login' | 'signup')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Giriş Yap</TabsTrigger>
            <TabsTrigger value="signup">Hesap Oluştur</TabsTrigger>
          </TabsList>
          <TabsContent value={authAction}>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAuth)} className="space-y-4 pt-4">
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
                        <FormLabel>Yönetici PIN'i</FormLabel>
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
