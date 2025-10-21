
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoleSelect: (role: 'student' | 'admin') => void;
};

export function LoginDialog({
  role,
  open,
  onOpenChange,
  onRoleSelect,
}: LoginDialogProps) {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const formSchema = role === 'student' ? studentSchema : adminSchema;
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    // Initialize all possible fields to prevent uncontrolled -> controlled warning
    defaultValues: {
      firstName: '',
      lastName: '',
      pin: '',
    },
  });

  React.useEffect(() => {
    // Reset form values when the dialog opens or role changes
    if (open) {
      form.reset(
        role === 'student'
          ? { firstName: '', lastName: '', pin: '' }
          : { pin: '' }
      );
    }
  }, [role, open, form]);

  const handleStudentLogin = async (values: z.infer<typeof studentSchema>) => {
    if (!auth) return;
    setIsLoading(true);
    const { firstName, lastName, pin } = values;
    // Create a stable, unique "email" from user details
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@karaoke.app`;
    const password = `${pin}${firstName}${lastName}`; // Create a stable password

    try {
      // First, try to sign in
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: 'Welcome back!' });
      router.push('/student');
    } catch (signInError: any) {
      // If sign-in fails because the user doesn't exist, create a new account
      if (signInError.code === 'auth/user-not-found') {
        try {
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );
          // Set the user's display name
          await updateProfile(userCredential.user, {
            displayName: `${firstName} ${lastName}`,
          });
          toast({ title: 'Account created!', description: 'Welcome! Your new account is ready.' });
          router.push('/student');
        } catch (signUpError: any) {
          toast({
            variant: 'destructive',
            title: 'Sign-up failed',
            description: signUpError.message,
          });
        }
      } else if (signInError.code === 'auth/invalid-credential') {
        // Handle incorrect PIN specifically
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: 'Invalid PIN. Please try again.',
        });
      } else {
        // Handle other sign-in errors
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
    // Use a hardcoded, non-obvious UID for the admin account in rules
    const adminPassword = 'supersecretadminpassword';

    try {
      await signOut(auth); // Ensure any previous user is signed out
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      router.push('/admin');
    } catch (error: any) {
       // If the admin account doesn't exist, create it.
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          // IMPORTANT: This creates a user with a PREDICTABLE UID.
          // This requires a custom solution beyond the standard SDK or a backend function.
          // For this client-only example, we'll simulate this by creating the user
          // and then checking for that user's *actual* UID on the admin page.
          // A better solution would use a custom token with the desired UID.
          // For now, we will create the user and check against the known email.
           await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
           // We need to map this email to a specific UID for security rules.
           // A robust way is via custom claims set on the backend.
           // For client-side simulation, we will hardcode the UID on the admin page check.
           
           // In a real app, you would have a backend function to create the user with a specific UID
           // or set a custom claim. For this prototype, we will create the admin user here if it does not exist
           // and then hardcode the UID in the admin page.
           // To make this work, we'll create the user and then use a known UID 'admin-account' for our checks.
           // This is a workaround for the prototype.
           
           // For simplicity, we just create the user, and on the admin page, we'll have to check if the user is the admin by email/uid.
           // Let's create a user with a known email and then on the admin page, we will check against this.
           // For this prototype, we can't set a custom UID from the client.
           // So, we'll create the user here, then on the admin page, we'll check if the signed-in user's email is 'admin@karaoke.app'
           // And in the firestore rules, we'll have to be more creative.

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

  const onSubmit =
    role === 'student' ? handleStudentLogin : handleAdminLogin;

  return (
    <>
      <Button
        className="w-full"
        size="lg"
        onClick={() => onRoleSelect('student')}
      >
        Enter as Student
      </Button>
      <Button
        variant="secondary"
        className="w-full"
        size="lg"
        onClick={() => onRoleSelect('admin')}
      >
        Enter as Admin
      </Button>

      <Dialog open={open && !!role} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {role === 'student' ? 'Student Login' : 'Admin Login'}
            </DialogTitle>
            <DialogDescription>
              {role === 'student'
                ? 'Enter your name and a 4-digit PIN to access your song list. If you are new, an account will be created for you.'
                : 'Enter the admin PIN to access the dashboard.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit as any)}
              className="space-y-4"
            >
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
                    'Login'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// A special function to create the admin user with a known UID
// This is a client-side workaround. In a real app, this would be a secure backend operation.
async function createAdminUserWithKnownUID(auth: any, uid: string, email: string, pass: string) {
    // This is not possible with the standard client-side SDK.
    // This is a placeholder for what would be a custom auth setup.
    // For the prototype, we will create the user normally and check for their email/UID on the admin page.
    const userCred = await createUserWithEmailAndPassword(auth, email, pass);
    // In a real app you'd have a Cloud Function that takes this new user's actual UID
    // and sets a custom claim like { admin: true }.
    // Then your rules would check `request.auth.token.admin == true`.
    return userCred;
}
