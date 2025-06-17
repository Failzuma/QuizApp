import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, MapPin } from 'lucide-react';

const PixelMapIcon = () => (
  <MapPin className="h-6 w-6 text-primary" />
);

export function Header() {
  // TODO: Replace with real authentication logic
  const isLoggedIn = false; // Set to true to simulate logged-in state

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/profile', label: 'Profile' },
  ];

  const authNavItems = [
    { href: '/login', label: 'Login' },
    { href: '/register', label: 'Register' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 w-full max-w-screen-2xl mx-auto items-center px-4">
        {/* Left section (Logo + nav) */}
        <div className="flex items-center flex-1">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <PixelMapIcon />
            <span className="hidden font-bold sm:inline-block">
              QuizApp
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
          </nav>
        </div>

        {/* Right section (Login/Register) */}
        <div className="hidden md:flex items-center gap-2 ml-auto">
          {!isLoggedIn && (
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

        {/* Mobile Menu */}
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
                {isLoggedIn
                  ? navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="text-foreground hover:text-primary transition-colors py-1"
                      >
                        {item.label}
                      </Link>
                    ))
                  : authNavItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="text-foreground hover:text-primary transition-colors py-1"
                      >
                        {item.label}
                      </Link>
                    ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
