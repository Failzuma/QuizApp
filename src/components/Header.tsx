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
    // Login/Register links are handled separately for mobile/desktop actions
    // Add Admin link conditionally later
    // { href: '/admin', label: 'Admin Panel' },
  ];

  // Separate links for authentication actions for clarity
  const authNavItems = [
     { href: '/login', label: 'Login' },
     { href: '/register', label: 'Register' },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        {/* Logo and Primary Navigation (Left Side) */}
        <div className="flex items-center mr-auto"> {/* Changed flex-1 to mr-auto for clarity */}
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <PixelMapIcon />
            <span className="hidden font-bold sm:inline-block">
              QuizApp
            </span>
          </Link>
          {/* Desktop nav items can go here if needed beyond user actions */}
           <nav className="hidden md:flex items-center gap-6 text-sm">
             {navItems.map((item) => ( // Render main nav items here if any
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

        {/* Mobile Menu Trigger (Right side on mobile) */}
        <div className="md:hidden">
           <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="pr-0 w-[250px]"> {/* Adjust width as needed */}
                 <Link
                  href="/"
                  className="flex items-center space-x-2 mb-6 pl-6 pt-4" // Added padding
                >
                  <PixelMapIcon />
                  <span className="font-bold">QuizApp</span>
                </Link>
                {/* Combine main and auth links for mobile menu */}
                <nav className="flex flex-col gap-3 px-6">
                  {[...navItems, ...authNavItems].map((item) => (
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

        {/* Desktop User Actions (Login/Register - Far Right) */}
        {/* This div will be pushed to the right because the first div has mr-auto */}
        <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
           <Button asChild>
              <Link href="/register">Register</Link>
           </Button>
           {/* Conditional Profile/Logout buttons will go here */}
        </div>

      </div>
    </header>
  );
}
