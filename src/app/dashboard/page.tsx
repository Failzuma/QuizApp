
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

interface User {
    username: string;
    // Add other user properties as needed, e.g., role
}

export default function Dashboard() {
  const [user, setUser] = React.useState<User | null>(null);
  const [isClient, setIsClient] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    setIsClient(true); // Indicate client-side rendering is happening
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token) {
      // If no token, redirect to login. This is client-side protection.
      router.replace('/login');
    } else if (userData) {
      // If there is a token, parse user data to check their role
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error("Failed to parse user data from localStorage", e);
        // If data is corrupted, clear it and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('storage'));
        router.replace('/login');
      }
    } else {
        // If there's a token but no user data, something is wrong.
        // It's safer to log out and redirect to login.
        localStorage.removeItem('token');
        window.dispatchEvent(new Event('storage'));
        router.replace('/login');
    }
  }, [router]);

  if (!isClient || !user) {
    // On the server, or before the client-side check has run, render a loading state or nothing.
    // Also show loading if user is not yet set.
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
            {/* This button is for players to start a quiz/game. */}
           <Button>
             <PlayCircle className="mr-2 h-4 w-4" /> Start a Quiz Map
           </Button>
           {/* If the user is an admin, show a button to go to the admin panel */}
           {user && user.username === 'admin' && (
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
