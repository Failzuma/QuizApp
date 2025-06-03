
'use client'; // Required for useState, useEffect

import * as React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Map, PlayCircle, Shield } from 'lucide-react'; // Added Shield for admin
import { useRouter } from 'next/navigation';

// Mock data for available maps - Replace with actual data fetching later
const availableMaps = [
  { id: 'map1', title: 'English for IT - Vocabulary Basics', description: 'Learn fundamental IT terms in English.', subject: 'Bahasa Inggris', difficulty: 'Easy' },
  { id: 'map2', title: 'Basic English Grammar - Tenses', description: 'Practice using present, past, and future tenses.', subject: 'Bahasa Inggris', difficulty: 'Medium' },
  { id: 'map3', title: 'Networking Concepts Map', description: 'Explore the basics of computer networking (Placeholder).', subject: 'Jaringan Komputer', difficulty: 'Medium' },
];

export default function Dashboard() {
  const [userType, setUserType] = React.useState<string | null>(null);
  const [isClient, setIsClient] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    setIsClient(true); // Indicate client-side rendering
    const type = localStorage.getItem('userType');
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    setUserType(type);

    // Basic protection: redirect if not logged in (for client-side)
    // Proper protection should be via middleware or server-side checks
    if (!loggedIn) {
      router.replace('/login');
    }
  }, [router]);

  if (!isClient) {
    // Render nothing or a loading state on the server until client takes over
    return null; 
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
            {/* This button is for players to start a quiz/game. It's not for creating quizzes. */}
           <Button>
             <PlayCircle className="mr-2 h-4 w-4" /> Start a Quiz Map
           </Button>
           {/* If the user is an admin, show a button to go to the admin panel to create/manage quizzes */}
           {userType === 'admin' && (
             <Button variant="outline" asChild>
               <Link href="/admin">
                 <Shield className="mr-2 h-4 w-4" /> Manage Quizzes (Admin)
               </Link>
             </Button>
           )}
         </div>

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
      </main>
      <Footer />
    </div>
  );
}
