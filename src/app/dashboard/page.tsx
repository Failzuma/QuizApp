
'use client'; // Required for useState, useEffect

import * as React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Map, PlayCircle, Shield, Loader2 } from 'lucide-react'; // Added Loader2
import { useRouter } from 'next/navigation';

interface AvailableMap {
    id: string;
    title: string;
    description: string;
    subject: string;
    difficulty: string;
}

interface User {
    username: string;
    // Add other user properties as needed, e.g., role
}

export default function Dashboard() {
  const [user, setUser] = React.useState<User | null>(null);
  const [availableMaps, setAvailableMaps] = React.useState<AvailableMap[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isClient, setIsClient] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    setIsClient(true); // Indicate client-side rendering is happening
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token) {
      router.replace('/login');
    } else if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error("Failed to parse user data from localStorage", e);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('storage'));
        router.replace('/login');
      }
    } else {
        localStorage.removeItem('token');
        window.dispatchEvent(new Event('storage'));
        router.replace('/login');
    }

    const fetchMaps = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/maps');
            if (!response.ok) {
                throw new Error('Failed to fetch maps');
            }
            const maps: AvailableMap[] = await response.json();
            setAvailableMaps(maps);
        } catch (error) {
            console.error(error);
            // Handle error state if needed, e.g., show a toast message
        } finally {
            setIsLoading(false);
        }
    };

    fetchMaps();

  }, [router]);

  if (!isClient || !user) {
    return null; // Or a loading spinner component
  }


  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-primary">Available Learning Maps</h1>
        <p className="text-muted-foreground mb-8">
          Choose a map to start your learning adventure or join an existing room.
        </p>

         <div className="mb-8 flex space-x-2">
           <Button>
             <PlayCircle className="mr-2 h-4 w-4" /> Start a Quiz Map
           </Button>
           {user && user.username === 'admin' && (
             <Button variant="outline" asChild>
               <Link href="/admin">
                 <Shield className="mr-2 h-4 w-4" /> Manage Quizzes (Admin)
               </Link>
             </Button>
           )}
         </div>

        {isLoading ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading quizzes...</p>
            </div>
        ) : availableMaps.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableMaps.map((map) => (
                <Card key={map.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <Map className="h-8 w-8 text-primary opacity-70" />
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-secondary text-secondary-foreground">{map.difficulty}</span>
                    </div>
                    <CardTitle>{map.title}</CardTitle>
                    <CardDescription>{map.subject}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground">{map.description}</p>
                  </CardContent>
                  <div className="p-4 pt-0 mt-auto">
                     <Button className="w-full" asChild>
                       <Link href={`/game/${map.id}`}>Start Quiz</Link>
                     </Button>
                  </div>
                </Card>
              ))}
            </div>
        ) : (
             <div className="text-center py-16">
                <Card className="inline-block p-8">
                    <CardTitle>No Quizzes Available</CardTitle>
                    <CardDescription className="mt-2">
                        There's no quiz currently. Please check back later or contact an admin.
                    </CardDescription>
                </Card>
            </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
