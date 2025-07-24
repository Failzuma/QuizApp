
'use client'; 

import * as React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Map, PlayCircle, Shield, Loader2, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';

// This interface now represents a playable Quiz, not a Map
interface PlayableQuiz {
    id: number; // quiz_id
    title: string;
    description: string;
    mapId: string; // The map used as a blueprint
}

interface User {
    username: string;
}

export default function Dashboard() {
  const [user, setUser] = React.useState<User | null>(null);
  const [availableQuizzes, setAvailableQuizzes] = React.useState<PlayableQuiz[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isClient, setIsClient] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    setIsClient(true);
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

    const fetchQuizzes = async () => {
        setIsLoading(true);
        try {
            // Fetch from the new /api/quizzes endpoint
            const response = await fetch('/api/quizzes');
            if (!response.ok) {
                throw new Error('Failed to fetch quizzes');
            }
            const quizzes: PlayableQuiz[] = await response.json();
            setAvailableQuizzes(quizzes);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchQuizzes();

  }, [router]);

  if (!isClient || !user) {
    return null; // Or a loading spinner component
  }


  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-primary">Available Quizzes</h1>
        <p className="text-muted-foreground mb-8">
          Choose a quiz to start your learning adventure.
        </p>

         <div className="mb-8 flex space-x-2">
           {user && user.username === 'admin' && (
             <Button variant="outline" asChild>
               <Link href="/admin">
                 <Shield className="mr-2 h-4 w-4" /> Manage Content (Admin)
               </Link>
             </Button>
           )}
         </div>

        {isLoading ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading available quizzes...</p>
            </div>
        ) : availableQuizzes.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableQuizzes.map((quiz) => (
                <Card key={quiz.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <BookOpen className="h-8 w-8 text-primary opacity-70" />
                    </div>
                    <CardTitle>{quiz.title}</CardTitle>
                    <CardDescription>Map: {quiz.mapId}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground">{quiz.description}</p>
                  </CardContent>
                  <div className="p-4 pt-0 mt-auto">
                     <Button className="w-full" asChild>
                       {/* The link now points to the specific quiz instance */}
                       <Link href={`/game/${quiz.id}`}>
                         <PlayCircle className="mr-2 h-4 w-4"/>
                         Start Quiz
                       </Link>
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
                        There are no quizzes currently. Please check back later or contact an admin.
                    </CardDescription>
                </Card>
            </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
