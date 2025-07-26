
'use client';

import * as React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';


interface UserProfile {
  username: string;
  email: string;
  created_at: string;
  character: string;
}

interface SessionHistoryItem {
  id: string;
  mapTitle: string;
  score: number;
  date: string;
}

const characters = [
    '/assets/images/player_placeholder_32.png',
    '/assets/images/player2_placeholder_32.png',
    '/assets/images/player3_placeholder_32.png',
    '/assets/images/player4_placeholder_32.png',
    '/assets/images/player5_placeholder_32.png'
];

export default function ProfilePage() {
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [history, setHistory] = React.useState<SessionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isCharacterModalOpen, setIsCharacterModalOpen] = React.useState(false);
  const [selectedCharacter, setSelectedCharacter] = React.useState<string>('');

  const { toast } = useToast();
  const router = useRouter();

  React.useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast({ title: "Akses Ditolak", description: "Silakan login terlebih dahulu.", variant: 'destructive' });
        router.push('/login');
        return;
      }

      try {
        const response = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setProfile(data.user);
          setSelectedCharacter(data.user.character)
          setHistory(data.history);
        } else {
          const errorData = await response.json();
          toast({ title: "Gagal Memuat Profil", description: errorData.error || "Terjadi kesalahan.", variant: 'destructive' });
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.dispatchEvent(new Event('storage'));
            router.push('/login');
          }
        }
      } catch (error) {
        toast({ title: "Error", description: "Tidak dapat terhubung ke server.", variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [router, toast]);

  const handleCharacterSelect = (character: string) => {
    setSelectedCharacter(character);
  };

  const handleCharacterSave = async () => {
    const token = localStorage.getItem('token');
    if (!token || !selectedCharacter) return;

    try {
      const response = await fetch('/api/user/character', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ character: selectedCharacter })
      });

      if(response.ok) {
        const updatedUser = await response.json();
        setProfile(prev => prev ? { ...prev, character: updatedUser.character } : null);
        toast({ title: "Sukses", description: "Karakter berhasil diperbarui!" });
        setIsCharacterModalOpen(false);

        const localUser = localStorage.getItem('user');
        if (localUser) {
            const parsedUser = JSON.parse(localUser);
            parsedUser.character = updatedUser.character;
            localStorage.setItem('user', JSON.stringify(parsedUser));
            window.dispatchEvent(new Event('storage'));
        }

      } else {
        const errorData = await response.json();
        toast({ title: "Gagal", description: errorData.error || "Tidak dapat memperbarui karakter.", variant: 'destructive' });
      }
    } catch (error) {
       toast({ title: "Error", description: "Tidak dapat terhubung ke server.", variant: 'destructive' });
    }
  };


  if (isLoading) {
    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
                <Skeleton className="h-8 w-48 mb-8" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                        <Card>
                           <CardHeader className="items-center text-center">
                             <Skeleton className="h-24 w-24 rounded-full mb-4" />
                             <Skeleton className="h-6 w-3/4" />
                             <Skeleton className="h-4 w-1/2 mt-2" />
                             <Skeleton className="h-5 w-1/3 mt-2" />
                           </CardHeader>
                        </Card>
                    </div>
                    <div className="md:col-span-2">
                        <Card>
                            <CardHeader>
                                <Skeleton className="h-6 w-1/2" />
                                <Skeleton className="h-4 w-3/4 mt-2" />
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <Skeleton className="h-5 w-48" />
                                        <Skeleton className="h-4 w-32 mt-1" />
                                    </div>
                                    <Skeleton className="h-8 w-16" />
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                    <div>
                                        <Skeleton className="h-5 w-48" />
                                        <Skeleton className="h-4 w-32 mt-1" />
                                    </div>
                                    <Skeleton className="h-8 w-16" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
  }

  if (!profile) {
     return (
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8 text-center">
            <p>Gagal memuat profil. Silakan coba lagi.</p>
          </main>
          <Footer />
        </div>
      );
  }


  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-primary">Profil Saya</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
             <Card>
               <CardHeader className="items-center text-center">
                 <Avatar className="h-24 w-24 mb-4">
                   <AvatarImage src={profile.character} alt={profile.username} />
                   <AvatarFallback>{profile.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                 </Avatar>
                 <CardTitle>{profile.username}</CardTitle>
                 <CardDescription>{profile.email}</CardDescription>
                 <Badge variant="secondary" className="mt-2">Bergabung: {new Date(profile.created_at).toLocaleDateString()}</Badge>
                  <Dialog open={isCharacterModalOpen} onOpenChange={setIsCharacterModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="mt-4">Ubah Karakter</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Pilih Karakter</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-3 gap-4 py-4">
                        {characters.map(char => (
                          <div
                            key={char}
                            className={`p-2 rounded-md cursor-pointer transition-all ${selectedCharacter === char ? 'ring-2 ring-primary' : 'hover:bg-accent'}`}
                            onClick={() => handleCharacterSelect(char)}
                          >
                            <img src={char} alt="player character" className="w-full h-auto" />
                          </div>
                        ))}
                      </div>
                      <Button onClick={handleCharacterSave} disabled={!selectedCharacter}>Simpan</Button>
                    </DialogContent>
                  </Dialog>
               </CardHeader>
             </Card>
          </div>

          <div className="md:col-span-2">
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <List className="h-5 w-5" />
                   Riwayat Sesi
                 </CardTitle>
                 <CardDescription>Aktivitas dan skor terbaru Anda per sesi.</CardDescription>
               </CardHeader>
               <CardContent>
                 {history && history.length > 0 ? (
                   <ul className="space-y-4">
                     {history.map((session, index) => (
                       <li key={session.id}>
                         <div className="flex justify-between items-center">
                           <div>
                             <p className="font-medium">{session.mapTitle}</p>
                             <p className="text-sm text-muted-foreground">
                               Selesai pada {new Date(session.date).toLocaleDateString()}
                             </p>
                           </div>
                           <Badge variant={session.score >= 80 ? "default" : "outline"} className="text-lg font-semibold bg-primary text-primary-foreground">
                             {session.score}%
                           </Badge>
                         </div>
                         {index < history.length - 1 && <Separator className="my-4" />}
                       </li>
                     ))}
                   </ul>
                 ) : (
                   <p className="text-muted-foreground">Belum ada riwayat sesi. Mulai mainkan sebuah kuis untuk melihat progres Anda di sini!</p>
                 )}
               </CardContent>
             </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
