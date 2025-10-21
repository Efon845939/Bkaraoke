
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
    .min(1, 'First name is required')
    .transform(
      (name) => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
    ),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .transform(
      (name) => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
    ),
  pin: z.string().length(4, 'PIN must be 4 digits.').regex(/^\d{4}$/, 'PIN must be 4 digits.'),
});

const adminSchema = z.object({
  pin: z.string().refine((pin) => pin === 'kara90ke', {
    message: 'Invalid admin PIN.',
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
      toast({ title: 'Account created!', description: 'Welcome! Your new account is ready.' });
      router.push('/student');
    } catch (signUpError: any) {
      if (signUpError.code === 'auth/email-already-in-use') {
        toast({
          variant: 'destructive',
          title: 'Sign-up failed',
          description: 'An account with this name already exists. Please sign in.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Sign-up failed',
          description: signUpError.message,
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
      toast({ title: 'Welcome back!' });
      router.push('/student');
    } catch (signInError: any) {
      if (signInError.code === 'auth/user-not-found') {
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: 'No account found with this name. Please sign up first.',
        });
      } else if (signInError.code === 'auth/invalid-credential') {
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: 'Invalid PIN. Please try again.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: signInError.message,
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
           toast({ variant: 'destructive', title: 'Admin setup failed', description: creationError.message });
        }
      } else {
        toast({ variant: 'destructive', title: 'Admin login failed', description: error.message });
      }
    } finally {
      setIsLoading(false);
      onOpenChange(false);
    }
  };

  const getDialogContent = () => {
    if (role === 'admin') {
      return {
        title: 'Admin Login',
        description: 'Enter the admin PIN to access the dashboard.',
        handler: handleAdminLogin,
        buttonText: 'Login'
      };
    }
    if (role === 'student') {
      if (authAction === 'signup') {
        return {
          title: 'Create Student Account',
          description: 'Enter your name and a 4-digit PIN to create an account.',
          handler: handleStudentSignUp,
          buttonText: 'Sign Up'
        };
      }
      return {
        title: 'Student Login',
        description: 'Enter your name and PIN to access your song list.',
        handler: handleStudentSignIn,
        buttonText: 'Sign In'
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
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Jane" {...field} />
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
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Doe" {...field} />
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
                  <FormLabel>{role === 'student' ? '4-Digit PIN' : 'Admin PIN'}</FormLabel>
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
