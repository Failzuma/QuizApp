
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
import { Separator } from '@/components/ui/separator'; // Import Separator
import { cn } from '@/lib/utils'; // Import cn

export default function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(true); // Default rememberMe to true
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter(); // Initialize router
  const { toast } = useToast(); // Initialize toast

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    console.log('Login attempt with:', { email, password, rememberMe });

    // Hardcoded admin check
    if (email === 'admin' && password === 'admin') {
        console.log('Admin login successful');
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userType', 'admin');
        // Dispatch a storage event to notify other components like Header
        window.dispatchEvent(new Event('storage'));
        toast({
            title: "Admin Login Successful",
            description: "Redirecting to admin panel...",
        });
        await new Promise(resolve => setTimeout(resolve, 1000)); 
        router.push('/admin'); 
        setIsLoading(false);
        return; 
    }

    // Simulate player login for any other non-empty credentials
    if (email && password) {
        console.log('Player login successful (simulated)');
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userType', 'player');
         // Dispatch a storage event to notify other components like Header
        window.dispatchEvent(new Event('storage'));
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast({
            title: "Login Successful",
            description: "Welcome back! Redirecting to your dashboard...",
        });
        router.push('/dashboard'); 
        setIsLoading(false);
        return;
    }

    console.log('Login failed (invalid credentials or empty fields)');
    await new Promise(resolve => setTimeout(resolve, 500));
    toast({
        title: "Login Failed",
        description: "Invalid email or password. Please try again.",
        variant: "destructive",
    });
    
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
            <CardDescription>Log in to continue your learning adventure on QuizApp.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email or Username</Label>
                <Input
                  id="email"
                  type="text" 
                  placeholder="Enter your email or username"
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
                  placeholder="Enter your password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                   <div className="flex items-center space-x-2">
                    <Checkbox
                        id="remember-me"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(Boolean(checked))} 
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
                  href="/forgot-password" 
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
