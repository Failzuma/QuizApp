
'use client'; // Required for form handling

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Import useRouter
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn } from 'lucide-react';
import { useToast } from "@/hooks/use-toast"; // Import useToast

export default function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(false); // State for checkbox
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter(); // Initialize router
  const { toast } = useToast(); // Initialize toast

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    // TODO: Implement actual authentication logic here
    console.log('Login attempt with:', { email, password, rememberMe });

    // Hardcoded admin check
    if (email === 'admin@polnep.ac.id' && password === 'admin') {
        console.log('Admin login successful');
        toast({
            title: "Admin Login Successful",
            description: "Redirecting to admin panel...",
        });
        await new Promise(resolve => setTimeout(resolve, 1000)); // Short delay for toast visibility
        router.push('/admin'); // Redirect to admin page
        setIsLoading(false);
        return; // Stop further execution
    }

    // Simulate network request for regular users (replace with actual API call)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // --- Placeholder for actual user authentication ---
    // Example: Assume login failed for now
    console.log('Regular login failed (placeholder)');
    toast({
        title: "Login Failed",
        description: "Invalid email or password.",
        variant: "destructive",
    });
    // --- End Placeholder ---

    // On success for regular user:
    // toast({ title: "Login Successful", description: "Redirecting to dashboard..." });
    // router.push('/dashboard');

    setIsLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
             <div className="mx-auto mb-4 p-3 rounded-full bg-secondary w-fit">
                <LogIn className="h-8 w-8 text-primary" />
              </div>
            <CardTitle>Welcome Back!</CardTitle>
            <CardDescription>Log in to continue your learning adventure.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="mahasiswa@polnep.ac.id or admin@polnep.ac.id"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                 <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="Enter your password" // Added placeholder
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
                {/* Remember Me Checkbox and Forgot Password Link */}
              <div className="flex items-center justify-between space-x-2">
                   <div className="flex items-center space-x-2">
                    <Checkbox
                        id="remember-me"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(Boolean(checked))} // Handle state change
                        disabled={isLoading}
                        aria-label="Keep me logged in"
                     />
                     <Label
                        htmlFor="remember-me"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Keep me logged in
                     </Label>
                   </div>
                <Link
                  href="/forgot-password" // Create this page later if needed
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Logging In...' : 'Log In'}
              </Button>
            </form>
            <Separator className="my-6" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link href="/register" className="font-medium text-primary hover:underline">
                  Register here
                </Link>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Or{' '}
                <Link href="/dashboard" className="font-medium text-primary hover:underline">
                  continue as Visitor
                </Link>
                 (progress not saved).
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

// Simple separator component (can be moved to ui/separator later if needed)
function Separator({ className }: { className?: string }) {
    return <div className={cn('shrink-0 bg-border h-[1px] w-full', className)} />;
}

// cn utility function (should already exist in lib/utils)
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
