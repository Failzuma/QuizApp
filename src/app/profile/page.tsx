
'use client';

import * as React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { List, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

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
  { name: 'Rogue', path: '/assets/images/player_placeholder_32.png' },
  { name: 'Knight', path: '/assets/images/player2_placeholder_32.png' },
  { name: 'Mage', path: '/assets/images/player3_placeholder_32.png' },
  { name: 'Archer', path: '/assets/images/player4_placeholder_32.png' },
  { name: 'Healer', path: '/assets/images/player5_placeholder_32.png' }
];

const CharacterPreview: React.FC<{ characterPath: string }> = ({ characterPath }) => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    React.useEffect(() => {
        const image = new Image();
        image.src = characterPath;
        image.onload = () => {
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.imageSmoothingEnabled = false;
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    // Draw a 32x32 sprite, scaled up to 96x96
                    ctx.drawImage(image, 0, 0, 32, 32, 0, 0, 96, 96);
                }
            }
        };
    }, [characterPath]);

    return <canvas ref={canvasRef} width="96" height="96" className="border-2 border-dashed rounded-lg" />;
};

export default function ProfilePage() {
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [history, setHistory] = React.useState<SessionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedCharacter, setSelectedCharacter] = React.useState<string>('');
  const [isSaving, setIsSaving] = React.useState(false);
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
          setSelectedCharacter(data.user.character || characters[0].path);
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


  const handleCharacterSave = async () => {
    const token = localStorage.getItem('token');
    if (!token || !selectedCharacter) return;

    setIsSaving(true);
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
    } finally {
        setIsSaving(false);
    }
  };


  if (isLoading) {
    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
                <Skeleton className="h-8 w-48 mb-8" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1 space-y-8">
                        <Card>
                           <CardHeader className="items-center text-center">
                             <Skeleton className="h-24 w-24 rounded-full mb-4" />
                             <Skeleton className="h-6 w-3/4" />
                             <Skeleton className="h-4 w-1/2 mt-2" />
                             <Skeleton className="h-5 w-1/3 mt-2" />
                           </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader>
                               <Skeleton className="h-6 w-1/2" />
                               <Skeleton className="h-4 w-3/4 mt-2" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-10 w-full mt-4" />
                            </CardContent>
                        </Card>
                    </div>
                    <div className="md:col-span-2">
                        <Card>
                            <CardHeader>
                                <Skeleton className="h-6 w-1/2" />
                                <Skeleton className="h-4 w-3/4 mt-2" />
                            </CardHeader>
                            <CardContent className="space-y-6">
                               <Skeleton className="h-16 w-full" />
                               <Skeleton className="h-16 w-full" />
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div className="md:col-span-1 space-y-8">
             <Card>
               <CardHeader className="items-center text-center">
                 <Avatar className="h-24 w-24 mb-4">
                   <AvatarImage src={`https://api.dicebear.com/8.x/pixel-art/svg?seed=${profile.username}`} alt={profile.username} />
                   <AvatarFallback>{profile.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                 </Avatar>
                 <CardTitle>{profile.username}</CardTitle>
                 <CardDescription>{profile.email}</CardDescription>
                 <Badge variant="secondary" className="mt-2">Bergabung: {new Date(profile.created_at).toLocaleDateString()}</Badge>
               </CardHeader>
             </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Karakter Game</CardTitle>
                    <CardDescription>Pilih karakter yang akan kamu gunakan dalam permainan.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    <div className="p-2 border-2 border-dashed rounded-lg bg-muted">
                       <CharacterPreview characterPath={selectedCharacter} />
                    </div>
                    <div className="grid grid-cols-5 gap-2 w-full">
                        {characters.map(char => (
                            <button
                            key={char.name}
                            className={`p-1 rounded-md transition-all ${selectedCharacter === char.path ? 'ring-2 ring-primary' : 'hover:bg-accent'}`}
                            onClick={() => setSelectedCharacter(char.path)}
                            title={char.name}
                            >
                                <img src={char.path} alt={char.name} className="w-full h-auto" style={{ imageRendering: 'pixelated' }}/>
                            </button>
                        ))}
                    </div>
                     <Button onClick={handleCharacterSave} disabled={isSaving || selectedCharacter === profile.character} className="w-full">
                       {isSaving ? 'Menyimpan...' : (
                           <>
                            <Save className="mr-2 h-4 w-4" /> Simpan Pilihan
                           </>
                       )}
                    </Button>
                </CardContent>
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
