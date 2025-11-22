'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Package, ShoppingCart, Menu, UserCircle, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: Home,
  },
  {
    href: '/dashboard/produtos',
    label: 'Produtos',
    icon: Package,
  },
  {
    href: '/dashboard/vendas',
    label: 'Vendas',
    icon: ShoppingCart,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState('Usuário');
  const [isOpen, setIsOpen] = useState(false); 

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    
    if (token) {
      try {
        //DECODIFICA O JWT
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);
        
        const nameFromToken = payload.unique_name || payload.name || payload.email || 'Usuário';
        setUserName(nameFromToken);
      } catch (error) {
        console.error("Erro ao ler token:", error);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.push('/'); 
  };

  const NavLinks = () => (
    <div className="flex flex-col gap-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        
        return (
          <Link 
            href={item.href} 
            key={item.label} 
            onClick={() => setIsOpen(false)} 
          >
            <Button
              variant={isActive ? 'secondary' : 'ghost'}
              className={cn("w-full justify-start gap-2", isActive && "bg-secondary")}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        );
      })}
    </div>
  );

  const UserInfo = () => (
    <div className="mt-auto pt-4 border-t flex items-center justify-between px-2">
      <div className="flex items-center gap-2 overflow-hidden">
        <UserCircle className="h-8 w-8 text-muted-foreground" />
        <div className="flex flex-col truncate">
          <span className="text-sm font-medium truncate max-w-[120px]" title={userName}>
            {userName}
          </span>
          <span className="text-xs text-muted-foreground">Logado</span>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
        <LogOut className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );

  return (
    <>
      <div className="md:hidden flex items-center p-4 border-b bg-background">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col w-72">
            <SheetHeader className="mb-4 text-left">
              <SheetTitle>Avanade Estoque</SheetTitle>
            </SheetHeader>
            

            <div className="flex-1">
              <NavLinks />
            </div>

            <UserInfo />
          </SheetContent>
        </Sheet>
        <span className="ml-4 font-semibold">Avanade Estoque</span>
      </div>

      <aside className="hidden md:flex h-screen w-64 flex-col border-r bg-background fixed left-0 top-0">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="">Avanade Estoque</span>
          </Link>
        </div>
        
        <nav className="flex-1 p-4 overflow-y-auto">
          <NavLinks />
        </nav>

        <div className="p-4">
          <UserInfo />
        </div>
      </aside>

      <div className="hidden md:block w-64 shrink-0" />
    </>
  );
}