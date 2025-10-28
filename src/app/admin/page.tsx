
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AdminDashboard } from '@/components/admin-dashboard';

export default function AdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    // sessionStorage'dan admin durumunu kontrol et
    const adminAuthenticated = sessionStorage.getItem('adminAuthenticated');
    if (adminAuthenticated !== 'true') {
      router.push('/login');
    } else {
      setIsAdmin(true);
    }
  }, [router]);

  // Eğer admin değilse, render etmeden önce yönlendirmenin bitmesini bekle
  if (!isAdmin) {
    return (
        <div className="flex h-screen items-center justify-center">
            <p>Yönlendiriliyor...</p>
        </div>
    );
  }

  return <AdminDashboard />;
}
