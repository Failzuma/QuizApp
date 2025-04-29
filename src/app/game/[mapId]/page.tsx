
'use client';

import React, { useEffect, useRef, useState, use } from 'react';
import * as Phaser from 'phaser'; // Import Phaser as a namespace
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
  const resolvedParams = use(params); // Use React.use to resolve the promise
  const [players, setPlayers] = useState(mockPlayers.sort((a, b) => b.score - a.score));
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<typeof mockQuizzes[string] | null>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const sceneInstanceRef = useRef<MainScene | null>(null);


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

  // Function to signal Phaser to re-enable a node
  const reEnableNode = (nodeId: string) => {
    sceneInstanceRef.current?.reEnableNode(nodeId);
  };


  // Initialize Phaser Game
   useEffect(() => {
        if (!gameContainerRef.current || gameInstanceRef.current) {
          return;
        }

        const mainScene = new MainScene();
        sceneInstanceRef.current = mainScene; // Store scene instance

        const config: Phaser.Types.Core.GameConfig = {
          type: Phaser.AUTO,
          parent: gameContainerRef.current,
          width: '100%',
          height: 600,
          physics: {
            default: 'arcade',
            arcade: {
              gravity: { y: 0 },
            },
          },
          scene: [mainScene], // Use the instance here
          scale: {
              mode: Phaser.Scale.FIT,
              autoCenter: Phaser.Scale.CENTER_BOTH,
          },
          // Pass the callback via scene create data
          callbacks: {
            postBoot: (game) => {
              // Access the scene instance after it's fully booted
              const scene = game.scene.getScene('MainScene') as MainScene;
              if (scene) {
                scene.init({ onNodeInteract: handleNodeInteraction });
                sceneInstanceRef.current = scene; // Ensure ref points to the active scene
              } else {
                  console.error("MainScene not found after boot");
              }
            }
          }
        };

        const game = new Phaser.Game(config);
        gameInstanceRef.current = game;


        return () => {
          console.log('Destroying Phaser game instance');
          gameInstanceRef.current?.destroy(true);
          gameInstanceRef.current = null;
          sceneInstanceRef.current = null; // Clear scene ref
        };
      }, []);

  const handleAnswerSubmit = (selectedAnswer: string) => {
      console.log('Answer submitted:', selectedAnswer);
      if (!currentQuiz || !sceneInstanceRef.current) return;

      // Extract nodeId from the current quiz context if needed
      const currentNodeId = Object.keys(mockQuizzes).find(key => mockQuizzes[key] === currentQuiz);


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

      // Re-enable the node in Phaser
      if(currentNodeId) {
        reEnableNode(currentNodeId);
      }

      setCurrentQuiz(null); // Reset current quiz
  };

  const closeQuiz = () => {
      setShowQuiz(false);
      const currentNodeId = Object.keys(mockQuizzes).find(key => mockQuizzes[key] === currentQuiz);
      if(currentNodeId) {
          reEnableNode(currentNodeId); // Re-enable node if quiz is closed without answering
      }
      setCurrentQuiz(null);
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2 text-primary">Map: {decodeURIComponent(resolvedParams.mapId)}</h1>
        <p className="text-muted-foreground mb-6">Room Code: <span className="font-mono bg-muted px-2 py-1 rounded">XYZ123</span> (Placeholder)</p>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative">
          {/* Game Area */}
          <div className="lg:col-span-3">
             <div
                ref={gameContainerRef}
                id="phaser-game-container"
                className="w-full h-[600px] bg-muted border border-muted-foreground overflow-hidden"
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
                <ScrollArea className="h-[550px] pr-4">
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
                               <Button variant="ghost" size="icon" onClick={closeQuiz}>
                                   <X className="h-5 w-5" />
                               </Button>
                           </div>

                        </CardHeader>
                        <CardContent>
                           <p className="mb-4 text-lg font-medium">{currentQuiz.question}</p>
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
                                <div>
                                    {/* Consider using react-hook-form for better state management */}
                                    <input id="short-answer-input" type="text" placeholder="Type your answer..." className="w-full p-2 border rounded mb-2" />
                                    <Button onClick={() => {
                                        const inputElement = document.getElementById('short-answer-input') as HTMLInputElement;
                                        handleAnswerSubmit(inputElement?.value || '');
                                    }}>Submit</Button>
                                </div>
                            )}
                           {/* TODO: Add rendering for other quiz types */}
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
