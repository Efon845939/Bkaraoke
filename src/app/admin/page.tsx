
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { AdminDashboard } from '@/components/admin-dashboard';
import { LoginDialog } from '@/components/login-dialog';


export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(true);


  const isAdminEmail = React.useMemo(() => {
     if (!user?.email) return false;
     return /@karaoke\.admin\.app$/.test(user.email.toLowerCase());
  }, [user]);


  React.useEffect(() => {
    if (isUserLoading) {
      return;
    }
    if (!user) {
        setDialogOpen(true);
    } else if (!isAdminEmail) {
        router.replace('/');
    } else {
        setDialogOpen(false);
    }
  }, [user, isUserLoading, isAdminEmail, router]);


  if (isUserLoading || !user || !isAdminEmail) {
    return (
       <LoginDialog
            role="admin"
            open={dialogOpen}
            onOpenChange={(isOpen) => {
                if (!isOpen && !user) {
                    router.push('/');
                }
                setDialogOpen(isOpen)
            }}
      />
    );
  }

  return isAdminEmail ? <AdminDashboard /> : null;
}
