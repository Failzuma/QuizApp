
'use client';

import React, { useEffect, useRef, useState, use } from 'react';
// Phaser is dynamically imported within useEffect
// import * as Phaser from 'phaser';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type MainSceneType from '@/game/scenes/MainScene'; // Import the type only
import type { NodeInteractionCallback } from '@/game/scenes/MainScene'; // Import the type only

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
  const sceneInstanceRef = useRef<MainSceneType | null>(null); // Use the imported type


  // Callback function for Phaser scene to trigger quiz
  const handleNodeInteraction: NodeInteractionCallback = (nodeId) => {
    console.log(`React received interaction from node: ${nodeId}`);
    const quizData = mockQuizzes[nodeId];
    if (quizData) {
        setCurrentQuiz(quizData);
        setShowQuiz(true);
    } else {
        console.warn(`No quiz found for nodeId: ${nodeId}`);
        // Optionally re-enable the node immediately if no quiz is found
        reEnableNode(nodeId);
    }
  };

  // Function to signal Phaser to re-enable a node
  const reEnableNode = (nodeId: string) => {
    // Ensure scene instance is available before calling method
    if (sceneInstanceRef.current) {
        sceneInstanceRef.current.reEnableNode(nodeId);
    } else {
        console.warn("Scene instance ref not set, cannot re-enable node.");
    }
  };


  // Initialize Phaser Game
   useEffect(() => {
        let game: Phaser.Game | null = null;

        const initPhaser = async () => {
            // Ensure we have the mapId before initializing
            if (!resolvedParams || !gameContainerRef.current || gameInstanceRef.current) {
              return;
            }

            // Dynamically import Phaser and the Scene
            const Phaser = await import('phaser');
            const { default: MainScene } = await import('@/game/scenes/MainScene');

            // Create the scene instance *before* the game config
            // Pass necessary data (mapId, callback) to the scene via its constructor or an init method
            const mainSceneInstance = new MainScene();

            const config: Phaser.Types.Core.GameConfig = {
              type: Phaser.AUTO,
              parent: gameContainerRef.current,
              // Set a base size, camera zoom will handle scaling
              width: 800,
              height: 600,
              physics: {
                default: 'arcade',
                arcade: {
                  gravity: { y: 0 },
                  // debug: process.env.NODE_ENV === 'development' // Optional debug drawing
                },
              },
              // Pass the scene *instance* here. Phaser will call its init, preload, create methods.
              scene: mainSceneInstance,
              // Ensure pixel art remains crisp
              render: {
                pixelArt: true,
                antialias: false,
              },
              scale: {
                  // Use RESIZE mode to allow the canvas to adapt to the container size
                  mode: Phaser.Scale.RESIZE,
                  autoCenter: Phaser.Scale.CENTER_BOTH, // Center the game canvas
              },
              // Use postBoot to safely access the scene instance after Phaser setup
              callbacks: {
                postBoot: (bootedGame) => {
                  // Access the scene instance using the key provided in its constructor (default is the class name)
                  const scene = bootedGame.scene.getScene('MainScene') as MainSceneType; // Cast to the imported type
                  if (scene) {
                      // Initialize the scene with mapId and callback AFTER it's ready
                      // Check if scene has an init method that accepts data, otherwise use a custom method
                      if (typeof scene.initScene === 'function') {
                        scene.initScene({ mapId: resolvedParams.mapId }, handleNodeInteraction);
                        sceneInstanceRef.current = scene; // Store the scene instance reference
                        console.log("Scene initialized with data in postBoot.");
                      } else {
                        console.error("MainScene does not have an initScene method.");
                         // Fallback or alternative setup if initScene isn't defined
                         scene.setInteractionCallback(handleNodeInteraction); // Assuming old method exists
                         sceneInstanceRef.current = scene;
                         console.warn("Used legacy setInteractionCallback. Consider adding initScene(data, callback) to MainScene.");
                      }

                  } else {
                      console.error("MainScene not found after boot. Ensure scene key matches.");
                      // Attempt to get by index if key fails (less reliable)
                      const sceneByIndex = bootedGame.scene.scenes[0];
                       if (sceneByIndex instanceof MainScene && typeof sceneByIndex.initScene === 'function') {
                           sceneByIndex.initScene({ mapId: resolvedParams.mapId }, handleNodeInteraction);
                           sceneInstanceRef.current = sceneByIndex;
                           console.log("Scene initialized via index in postBoot.");
                       } else {
                          console.error("Could not get scene instance by key or index, or initScene missing.");
                       }
                  }
                }
              }
            };

            game = new Phaser.Game(config);
            gameInstanceRef.current = game;
        }

        initPhaser();


        return () => {
          console.log('Destroying Phaser game instance');
          gameInstanceRef.current?.destroy(true);
          gameInstanceRef.current = null;
          sceneInstanceRef.current = null; // Clear scene ref
        };
      // Add resolvedParams to dependencies to re-initialize if it changes (e.g., navigating between maps)
      }, [resolvedParams]);

  const handleAnswerSubmit = (selectedAnswer: string) => {
      console.log('Answer submitted:', selectedAnswer);
      if (!currentQuiz) return;

      // Extract nodeId from the current quiz context
      // Find the key (nodeId) in mockQuizzes whose value matches currentQuiz
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

      // Re-enable the node in Phaser only if we found the ID
      if(currentNodeId) {
          reEnableNode(currentNodeId);
      } else {
        console.warn("Could not find Node ID for the submitted quiz to re-enable.");
      }

      setCurrentQuiz(null); // Reset current quiz
  };

  const closeQuiz = () => {
      setShowQuiz(false);
      const currentNodeId = Object.keys(mockQuizzes).find(key => mockQuizzes[key] === currentQuiz);
      if(currentNodeId) {
          reEnableNode(currentNodeId); // Re-enable node if quiz is closed without answering
      } else {
           console.warn("Could not find Node ID for the closed quiz to re-enable.");
      }
      setCurrentQuiz(null);
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Check if resolvedParams exists before accessing properties */}
        <h1 className="text-2xl font-bold mb-2 text-primary">Map: {resolvedParams ? decodeURIComponent(resolvedParams.mapId) : 'Loading...'}</h1>
        <p className="text-muted-foreground mb-6">Room Code: <span className="font-mono bg-muted px-2 py-1 rounded">XYZ123</span> (Placeholder)</p>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative">
          {/* Game Area */}
          <div className="lg:col-span-3">
             <div
                ref={gameContainerRef}
                id="phaser-game-container"
                // Use aspect-ratio to maintain shape, height is less critical with camera follow
                className="w-full aspect-video bg-muted border border-muted-foreground overflow-hidden rounded-lg shadow-md"
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
                 {/* Adjust height based on typical game container height */}
                <ScrollArea className="h-[450px] md:h-[550px] pr-4">
                  <ul className="space-y-4">
                    {players.map((player, index) => (
                      <li key={player.id} className="flex items-center justify-between p-2 rounded hover:bg-secondary transition-colors"> {/* Added hover effect */}
                        <div className="flex items-center gap-3">
                          <span className="font-semibold w-6 text-center text-muted-foreground">{index + 1}</span>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={player.avatar} alt={player.name} />
                            <AvatarFallback>{player.name.substring(0, 1)}</AvatarFallback>
                          </Avatar>
                          <span className={`flex-1 truncate ${player.name === 'You' ? 'font-bold text-primary' : ''}`}>{player.name}</span> {/* Highlight 'You' */}
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
                <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-10 p-4"> {/* Increased blur */}
                    <Card className="w-full max-w-lg shadow-xl border-primary border-2"> {/* Added primary border */}
                         <CardHeader>
                            <div className="flex justify-between items-center">
                               <CardTitle className="text-primary">Quiz Time!</CardTitle> {/* Styled title */}
                               <Button variant="ghost" size="icon" onClick={closeQuiz}>
                                   <X className="h-5 w-5 text-muted-foreground hover:text-foreground" /> {/* Styled close button */}
                               </Button>
                           </div>

                        </CardHeader>
                        <CardContent>
                           <p className="mb-6 text-lg font-medium">{currentQuiz.question}</p> {/* Increased margin */}
                            {currentQuiz.type === 'multiple-choice' && (
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                   {currentQuiz.options.map((option, index) => (
                                       <Button
                                           key={index}
                                           variant="outline"
                                           className="justify-start text-left h-auto py-3 hover:bg-accent hover:text-accent-foreground transition-colors duration-200" // Added hover effect
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
                                    <input id="short-answer-input" type="text" placeholder="Type your answer..." className="w-full p-2 border rounded mb-3 focus:ring-primary focus:border-primary" /> {/* Added focus style */}
                                    <Button onClick={() => {
                                        const inputElement = document.getElementById('short-answer-input') as HTMLInputElement;
                                        handleAnswerSubmit(inputElement?.value || '');
                                    }}
                                    className="w-full" // Make submit button full width
                                    >Submit</Button>
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
