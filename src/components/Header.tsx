import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, MapPin } from 'lucide-react';

// Placeholder for Pixel Art Icon - Replace with actual SVG or component later
const PixelMapIcon = () => (
  <MapPin className="h-6 w-6 text-primary" /> // Using Lucide as placeholder
);


export function Header() {
  // Basic navigation items - adjust based on authentication state later
  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/profile', label: 'Profile' },
    { href: '/login', label: 'Login' },
    { href: '/register', label: 'Register' },
    // Add Admin link conditionally later
    // { href: '/admin', label: 'Admin Panel' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <PixelMapIcon />
            <span className="hidden font-bold sm:inline-block">
              PetaPolnep
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            {/* Desktop nav items can go here if needed beyond user actions */}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          {/* Mobile Menu */}
          <div className="md:hidden">
             <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle Menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="pr-0">
                   <Link
                    href="/"
                    className="flex items-center space-x-2 mb-4"
                  >
                    <PixelMapIcon />
                    <span className="font-bold">PetaPolnep</span>
                  </Link>
                  <nav className="flex flex-col gap-4">
                    {navItems.map((item) => (
                       <Link
                        key={item.href}
                        href={item.href}
                        className="text-foreground hover:text-primary transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
          </div>

          {/* Desktop User Actions */}
          <nav className="hidden md:flex items-center gap-2">
             <Button variant="ghost" asChild>
                <Link href="/login">Login</Link>
              </Button>
             <Button asChild>
                <Link href="/register">Register</Link>
             </Button>
             {/* Conditional Profile/Logout buttons will go here */}
          </nav>
        </div>
      </div>
    </header>
  );
}
