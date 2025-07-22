
'use client'; // For useState, useEffect, useRouter

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, MapPin, UserCircle, LogOut, ShieldCheck, LayoutDashboard, LogIn, UserPlus } from 'lucide-react'; // Added icons
import { useToast } from "@/hooks/use-toast";

const PixelMapIcon = () => (
  <MapPin className="h-6 w-6 text-primary" />
);

interface User {
    user_id: number;
    username: string;
    email: string;
    // Add other user properties if needed
}

export function Header() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    // Function to update auth state from localStorage
    const updateAuthState = () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      if (token && userData) {
        setIsLoggedIn(true);
        try {
            setUser(JSON.parse(userData));
        } catch(e) {
            console.error("Failed to parse user data from localStorage", e);
            // Handle corrupted data by logging out
            handleLogout();
        }
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    };

    // Initial check
    updateAuthState();

    // Listen for custom 'storage' event dispatched from login/logout
    window.addEventListener('storage', updateAuthState);

    // Cleanup listener
    return () => {
      window.removeEventListener('storage', updateAuthState);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    // Dispatch a storage event to notify other components if necessary
    window.dispatchEvent(new Event('storage'));
    toast({ title: "Logout Berhasil", description: "Anda telah berhasil keluar." });
    router.push('/login');
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, requiresAuth: true },
    { href: '/profile', label: 'Profil', icon: <UserCircle className="h-4 w-4" />, requiresAuth: true },
    // Admin link can be conditional
    // Logout is a button, not a link
  ];


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="flex items-center mr-auto">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <PixelMapIcon />
            <span className="hidden font-bold sm:inline-block">
              PetaPolnep
            </span>
          </Link>
           <nav className="hidden md:flex items-center gap-6 text-sm">
             {isLoggedIn && navItems.map((item) => (
                 <Link
                  key={item.href}
                  href={item.href}
                  className="text-foreground hover:text-primary transition-colors"
                >
                  {item.label}
                </Link>
             ))}
             {isLoggedIn && user?.username === 'admin' && (
                <Link href="/admin" className="text-foreground hover:text-primary transition-colors">Admin</Link>
             )}
           </nav>
        </div>

        <div className="md:hidden">
           <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="pr-0 w-[250px]">
                 <Link
                  href="/"
                  className="flex items-center space-x-2 mb-6 pl-6 pt-4"
                >
                  <PixelMapIcon />
                  <span className="font-bold">PetaPolnep</span>
                </Link>
                <nav className="flex flex-col gap-3 px-6">
                  {isLoggedIn ? (
                    <>
                     {navItems.map((item) => (
                         <Link
                          key={item.href}
                          href={item.href}
                          className="text-foreground hover:text-primary transition-colors py-1 flex items-center gap-2"
                        >
                          {item.icon} {item.label}
                        </Link>
                      ))}
                      {user?.username === 'admin' && (
                          <Link href="/admin" className="text-foreground hover:text-primary transition-colors py-1 flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4" /> Admin
                          </Link>
                      )}
                      <Button
                        variant="ghost"
                        className="justify-start gap-2"
                        onClick={handleLogout}
                      >
                        <LogOut className="h-4 w-4" /> Logout
                      </Button>
                    </>
                  ) : (
                     <>
                        <Link href="/login" className="text-foreground hover:text-primary transition-colors py-1 flex items-center gap-2">
                            <LogIn className="h-4 w-4"/> Login
                        </Link>
                        <Link href="/register" className="text-foreground hover:text-primary transition-colors py-1 flex items-center gap-2">
                            <UserPlus className="h-4 w-4"/> Register
                        </Link>
                     </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
        </div>

        <div className="hidden md:flex items-center gap-2">
            {isLoggedIn ? (
                <>
                  <Button variant="outline" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </Button>
                </>
            ) : (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/login">Login</Link>
                  </Button>
                 <Button asChild>
                    <Link href="/register">Register</Link>
                 </Button>
                </>
            )}
        </div>

      </div>
    </header>
  );
}
