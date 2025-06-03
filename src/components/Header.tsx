
'use client'; // For useState, useEffect, useRouter

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, MapPin, UserCircle, LogOut, ShieldCheck } from 'lucide-react'; // Added icons
import { useToast } from "@/hooks/use-toast";

const PixelMapIcon = () => (
  <MapPin className="h-6 w-6 text-primary" />
);

export function Header() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [userType, setUserType] = React.useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    // Function to update auth state from localStorage
    const updateAuthState = () => {
      const loggedInStatus = localStorage.getItem('isLoggedIn') === 'true';
      const type = localStorage.getItem('userType');
      setIsLoggedIn(loggedInStatus);
      setUserType(type);
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
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userType');
    setIsLoggedIn(false);
    setUserType(null);
    // Dispatch a storage event to notify other components if necessary
    window.dispatchEvent(new Event('storage'));
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    router.push('/login');
  };

  const baseNavItems = [
    { href: '/dashboard', label: 'Dashboard', requiresAuth: true, adminOnly: false },
  ];

  const authNavItems = [
     { href: '/login', label: 'Login', requiresAuth: false, adminOnly: false },
     { href: '/register', label: 'Register', requiresAuth: false, adminOnly: false },
  ];

  const userActionItems = [
    { href: '/profile', label: 'Profile', icon: <UserCircle className="h-4 w-4" />, requiresAuth: true, adminOnly: false },
    // Admin Panel link is handled separately
  ];

  const getNavLinks = (isMobile: boolean) => {
    let links = [];
    if (isLoggedIn) {
      links.push(...baseNavItems.filter(item => item.requiresAuth));
      links.push(...userActionItems.filter(item => item.requiresAuth));
      if (userType === 'admin') {
        links.push({ href: '/admin', label: 'Admin Panel', icon: <ShieldCheck className="h-4 w-4" />, requiresAuth: true, adminOnly: true });
      }
      if (isMobile) { // Add logout to mobile menu if logged in
        links.push({ href: '#logout', label: 'Logout', icon: <LogOut className="h-4 w-4" />, action: handleLogout, requiresAuth: true, adminOnly: false });
      }
    } else {
      if(isMobile) { // For mobile, show Login/Register in the sheet if not logged in
          links.push(...authNavItems);
      }
      // For desktop, Login/Register buttons are handled separately outside this list
    }
    return links;
  };


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="flex items-center mr-auto">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <PixelMapIcon />
            <span className="hidden font-bold sm:inline-block">
              QuizApp
            </span>
          </Link>
           <nav className="hidden md:flex items-center gap-6 text-sm">
             {getNavLinks(false).map((item) => (
                 item.href !== '#logout' && ( // Exclude logout from here, it's a button
                 <Link
                  key={item.href}
                  href={item.href}
                  className="text-foreground hover:text-primary transition-colors"
                >
                  {item.label}
                </Link>
                 )
             ))}
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
                  <span className="font-bold">QuizApp</span>
                </Link>
                <nav className="flex flex-col gap-3 px-6">
                  {getNavLinks(true).map((item) => (
                    item.action ? (
                      <Button
                        key={item.label}
                        variant="ghost"
                        className="justify-start gap-2"
                        onClick={item.action}
                      >
                        {item.icon} {item.label}
                      </Button>
                    ) : (
                     <Link
                      key={item.href}
                      href={item.href}
                      className="text-foreground hover:text-primary transition-colors py-1 flex items-center gap-2"
                    >
                      {item.icon} {item.label}
                    </Link>
                    )
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
        </div>

        <div className="hidden md:flex items-center gap-2">
            {isLoggedIn ? (
                <>
                  {/* Profile link is already in navItems for desktop if needed, or could be a dedicated icon button */}
                  {/* <Button variant="ghost" asChild> <Link href="/profile"><UserCircle className="mr-2"/>Profile</Link></Button> */}
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
