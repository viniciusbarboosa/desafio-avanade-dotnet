'use client'; 
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      router.replace('/login');
    } else {
      setIsAuthenticated(true);
    }
    
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return <div>Carregando...</div>; 
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }
  
  return null;
}