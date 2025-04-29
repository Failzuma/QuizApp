'use client';

import React, { useEffect, useRef, useState, use } from 'react';
import Phaser from 'phaser';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import MainScene from '@/game/scenes/MainScene'; // Import the Phaser scene

// Mock Data - Replace with real-time data later
const mockPlayers = [
  { id: 'player1', name: 'Player One', score: 150, avatar: 'https://picsum.photos/seed/player1/40/40' },
  { id: 'player2', name: 'You', score: 120, avatar: 'https://picsum.photos/seed/you/40/40' },
  { id: 'player3', name: 'Player Three', score: 90, avatar: 'https://picsum.photos/seed/player3/40/40' },
  { id: 'player4', name: 'Another User', score: 75, avatar: 'https://picsum.photos/seed/user4/40/40' },
];

// More dynamic mock quiz based on node interaction
const mockQuizzes: Record<string, { type: string; question: string; options: string[]; correctAnswer: string }> = {
    'node_quiz1': {
        type: 'multiple-choice',
        question: 'Which HTML tag is used to define an internal style sheet?',
        options: ['<style>', '<script>', '<css>', '<link>'],
        correctAnswer: '<style>'
    },
    'node_quiz2': {
        type: 'short-answer', // Example of different type
        question: 'What does CSS stand for?',
        options: [], // No options for short answer initially in this UI
        correctAnswer: 'Cascading Style Sheets'
    }
};


export default function GamePage({ params }: { params: Promise<{ mapId: string }> }) {
  const resolvedParams = use(params);
  const [players, setPlayers] = useState(mockPlayers.sort((a, b) => b.score - a.score));
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<typeof mockQuizzes[string] | null>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);


  // Callback function for Phaser scene to trigger quiz
  const handleNodeInteraction = (nodeId: string) => {
    console.log(`React received interaction from node: ${nodeId}`);
    const quizData = mockQuizzes[nodeId];
    if (quizData) {
        setCurrentQuiz(quizData);
        setShowQuiz(true);
    } else {
        console.warn(`No quiz found for nodeId: ${nodeId}`);
    }
  };


  // Initialize Phaser Game
   useEffect(() => {
        if (!gameContainerRef.current || gameInstanceRef.current) {
          // If container isn't ready or game already exists, do nothing
          return;
        }

        const config: Phaser.Types.Core.GameConfig = {
          type: Phaser.AUTO,
          parent: gameContainerRef.current, // Use the ref here
          width: '100%', // Let the container div handle width
          height: 600, // Fixed height, adjust as needed
          physics: {
            default: 'arcade',
            arcade: {
              gravity: { y: 0 },
              // debug: process.env.NODE_ENV === 'development', // Enable debug outlines in dev
            },
          },
          scene: [MainScene], // Add your scene(s) here
          scale: {
              mode: Phaser.Scale.FIT, // Fit within the parent container
              autoCenter: Phaser.Scale.CENTER_BOTH,
          },
          // Pass the callback to the scene via scene config
          sceneConfig: {
              key: 'MainScene',
              data: { onNodeInteract: handleNodeInteraction },
              active: true // Start the scene immediately
          }

        };

        const game = new Phaser.Game(config);
        gameInstanceRef.current = game;


        // Cleanup function
        return () => {
          console.log('Destroying Phaser game instance');
          gameInstanceRef.current?.destroy(true);
          gameInstanceRef.current = null;
        };
      }, []); // Empty dependency array ensures this runs only once on mount

  const handleAnswerSubmit = (selectedAnswer: string) => {
      console.log('Answer submitted:', selectedAnswer);
      if (!currentQuiz) return;

      // TODO: Implement actual answer validation and scoring logic
      if (selectedAnswer === currentQuiz.correctAnswer) {
          console.log("Correct!");
          // Update player score (example)
          setPlayers(prevPlayers => prevPlayers.map(p =>
              p.name === 'You' ? { ...p, score: p.score + 10 } : p
          ).sort((a, b) => b.score - a.score));

      } else {
          console.log("Incorrect!");
      }
      setShowQuiz(false); // Hide quiz after answering
      setCurrentQuiz(null); // Reset current quiz
      // Potentially tell Phaser to re-enable the node if needed
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2 text-primary">Map: {decodeURIComponent(resolvedParams.mapId)}</h1>
        <p className="text-muted-foreground mb-6">Room Code: <span className="font-mono bg-muted px-2 py-1 rounded">XYZ123</span> (Placeholder)</p>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative">
          {/* Game Area */}
          <div className="lg:col-span-3">
             {/* Container for Phaser Game */}
             <div
                ref={gameContainerRef}
                id="phaser-game-container"
                className="w-full h-[600px] bg-muted border border-muted-foreground overflow-hidden" // Added overflow hidden
             >
                 {/* Phaser canvas will be injected here */}
             </div>
          </div>

          {/* Sidebar - Leaderboard */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Session Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[550px] pr-4"> {/* Adjusted height to match game */}
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
           {showQuiz && currentQuiz && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 p-4">
                    <Card className="w-full max-w-lg shadow-xl">
                         <CardHeader>
                            <div className="flex justify-between items-center">
                               <CardTitle>Quiz Time!</CardTitle>
                               <Button variant="ghost" size="icon" onClick={() => { setShowQuiz(false); setCurrentQuiz(null); }}>
                                   <X className="h-5 w-5" />
                               </Button>
                           </div>

                        </CardHeader>
                        <CardContent>
                           <p className="mb-4 text-lg font-medium">{currentQuiz.question}</p>
                            {/* Render different inputs based on quiz type */}
                            {currentQuiz.type === 'multiple-choice' && (
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                   {currentQuiz.options.map((option, index) => (
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
                           )}
                            {currentQuiz.type === 'short-answer' && (
                                // TODO: Implement short answer input field and submit button
                                <div>
                                    <input type="text" placeholder="Type your answer..." className="w-full p-2 border rounded mb-2" />
                                    <Button onClick={() => handleAnswerSubmit('user typed answer')}>Submit</Button>
                                </div>
                            )}
                           {/* TODO: Add rendering for other quiz types (Matching, Sequencing, etc.) */}
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
