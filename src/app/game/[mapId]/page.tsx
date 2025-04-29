'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

// Mock Data - Replace with real-time data later
const mockPlayers = [
  { id: 'player1', name: 'Player One', score: 150, avatar: 'https://picsum.photos/seed/player1/40/40' },
  { id: 'player2', name: 'You', score: 120, avatar: 'https://picsum.photos/seed/you/40/40' },
  { id: 'player3', name: 'Player Three', score: 90, avatar: 'https://picsum.photos/seed/player3/40/40' },
  { id: 'player4', name: 'Another User', score: 75, avatar: 'https://picsum.photos/seed/user4/40/40' },
];

const mockQuiz = {
    type: 'multiple-choice',
    question: 'Which HTML tag is used to define an internal style sheet?',
    options: ['<style>', '<script>', '<css>', '<link>'],
    correctAnswer: '<style>' // Store correct answer for validation
};


// Phaser Game Placeholder - This will be replaced by actual Phaser integration
const PhaserGamePlaceholder: React.FC = () => {
    return (
        <div
            id="phaser-game-container"
            className="w-full h-[500px] md:h-[600px] bg-muted border border-dashed border-muted-foreground flex items-center justify-center text-muted-foreground"
        >
            Phaser 3 Game Canvas Will Load Here
        </div>
    );
};


export default function GamePage({ params }: { params: { mapId: string } }) {
  const [players, setPlayers] = useState(mockPlayers.sort((a, b) => b.score - a.score));
  const [showQuiz, setShowQuiz] = useState(false); // Control quiz visibility


  // Simulate receiving a quiz trigger (e.g., from Phaser)
  useEffect(() => {
    const timer = setTimeout(() => {
        setShowQuiz(true);
    }, 5000); // Show quiz after 5 seconds
    return () => clearTimeout(timer);
  }, []);

  const handleAnswerSubmit = (selectedAnswer: string) => {
      console.log('Answer submitted:', selectedAnswer);
      // TODO: Validate answer, update score, sync with server/other players
      if (selectedAnswer === mockQuiz.correctAnswer) {
          console.log("Correct!");
          // Update player score (example)
          setPlayers(prevPlayers => prevPlayers.map(p =>
              p.name === 'You' ? { ...p, score: p.score + 10 } : p
          ).sort((a, b) => b.score - a.score));

      } else {
          console.log("Incorrect!");
      }
      setShowQuiz(false); // Hide quiz after answering
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2 text-primary">Map: {decodeURIComponent(params.mapId)}</h1>
        <p className="text-muted-foreground mb-6">Room Code: <span className="font-mono bg-muted px-2 py-1 rounded">XYZ123</span> (Placeholder)</p>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative">
          {/* Game Area */}
          <div className="lg:col-span-3">
            <PhaserGamePlaceholder />
          </div>

          {/* Sidebar - Leaderboard */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Session Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[450px] md:h-[550px] pr-4">
                  <ul className="space-y-4">
                    {players.map((player, index) => (
                      <li key={player.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold w-6 text-center">{index + 1}</span>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={player.avatar} alt={player.name} />
                            <AvatarFallback>{player.name.substring(0, 1)}</AvatarFallback>
                          </Avatar>
                          <span className={`flex-1 truncate ${player.name === 'You' ? 'font-bold' : ''}`}>{player.name}</span>
                        </div>
                        <span className="font-semibold text-primary">{player.score} pts</span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

           {/* Quiz Modal/Overlay */}
           {showQuiz && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 p-4">
                    <Card className="w-full max-w-lg shadow-xl">
                         <CardHeader>
                            <div className="flex justify-between items-center">
                               <CardTitle>Quiz Time!</CardTitle>
                               <Button variant="ghost" size="icon" onClick={() => setShowQuiz(false)}>
                                   <X className="h-5 w-5" />
                               </Button>
                           </div>

                        </CardHeader>
                        <CardContent>
                           <p className="mb-4 text-lg font-medium">{mockQuiz.question}</p>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                               {mockQuiz.options.map((option, index) => (
                                   <Button
                                       key={index}
                                       variant="outline"
                                       className="justify-start text-left h-auto py-3"
                                       onClick={() => handleAnswerSubmit(option)}
                                    >
                                       {option}
                                   </Button>
                               ))}
                           </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
