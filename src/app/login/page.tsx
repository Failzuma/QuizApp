
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    // Hardcoded admin credentials check for prototyping
    if (email === 'admin' && password === 'admin') {
      toast({
        title: "Admin Login Successful",
        description: "Redirecting to admin panel...",
      });
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userType', 'admin');
      window.dispatchEvent(new Event('storage')); // Notify header to update
      router.push('/admin'); // Redirect to admin page
      setIsLoading(false);
      return;
    }


    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Login Berhasil",
          description: "Selamat datang kembali!",
        });
        // Store token and user info
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        // --- Added for consistency with dashboard logic ---
        localStorage.setItem('isLoggedIn', 'true');
        // Determine user type (simple logic for prototype)
        const userType = data.user.username === 'admin' ? 'admin' : 'player';
        localStorage.setItem('userType', userType);
        // --- End of added logic ---

        // Dispatch storage event to update Header
        window.dispatchEvent(new Event('storage'));

        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        toast({
          title: "Login Gagal",
          description: data.error || "Kredensial tidak valid.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat mencoba login.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
            <CardTitle>Selamat Datang Kembali!</CardTitle>
            <CardDescription>Masuk untuk melanjutkan petualangan belajar Anda di Quizzer.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Masukkan email Anda"
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
                  placeholder="Masukkan password Anda"
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
                        aria-label="Biarkan saya tetap masuk"
                     />
                     <Label
                        htmlFor="remember-me"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Biarkan saya tetap masuk
                     </Label>
                   </div>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Lupa password?
                </Link>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sedang Masuk...' : 'Masuk'}
              </Button>
            </form>
            <Separator className="my-6" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Belum punya akun?{' '}
                <Link href="/register" className="font-medium text-primary hover:underline">
                  Daftar di sini
                </Link>
              </p>
               <p className="text-sm text-muted-foreground mt-2">
                Atau{' '}
                <Link href="/dashboard" className="font-medium text-primary hover:underline">
                  lanjut sebagai Pengunjung
                </Link>
                 (progress tidak disimpan).
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
