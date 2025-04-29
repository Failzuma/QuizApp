
'use client';

import React, { useEffect, useRef, useState, use } from 'react';
// Phaser is dynamically imported within useEffect
// import * as Phaser from 'phaser';
import { Header } from '@/components/Header';
// Footer removed to maximize game area
// import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Added CardDescription
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Import Input component
import { X, Trophy, Target, CheckSquare, Eye, EyeOff } from 'lucide-react'; // Added Trophy, Target, CheckSquare, Eye, EyeOff icons
import type MainSceneType from '@/game/scenes/MainScene'; // Import the type only
import type { NodeInteractionCallback, NodesCountCallback } from '@/game/scenes/MainScene'; // Import the types only
import { useToast } from "@/hooks/use-toast"; // Import useToast
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile hook
import type nipplejs from 'nipplejs'; // Import nipplejs type only for type checking

// Mock Data - Replace with real-time data later
const mockPlayers = [
  { id: 'player1', name: 'Player One', score: 150, avatar: 'https://picsum.photos/seed/player1/40/40' },
  { id: 'player2', name: 'You', score: 120, avatar: 'https://picsum.photos/seed/you/40/40' },
  { id: 'player3', name: 'Player Three', score: 90, avatar: 'https://picsum.photos/seed/player3/40/40' },
  { id: 'player4', name: 'Another User', score: 75, avatar: 'https://picsum.photos/seed/user4/40/40' },
];

// More dynamic mock quiz based on node interaction
const mockQuizzes: Record<string, { type: string; question: string; options: string[]; correctAnswer: string, nodeDescription: string }> = {
    'node_quiz1': {
        type: 'multiple-choice',
        question: 'Which HTML tag is used to define an internal style sheet?',
        options: ['<style>', '<script>', '<css>', '<link>'],
        correctAnswer: '<style>',
        nodeDescription: 'CSS Styling Basics Node'
    },
    'node_quiz2': {
        type: 'short-answer', // Example of different type
        question: 'What does CSS stand for?',
        options: [], // No options for short answer initially in this UI
        correctAnswer: 'Cascading Style Sheets',
        nodeDescription: 'CSS Acronym Node'
    }
};


export default function GamePage({ params }: { params: Promise<{ mapId: string }> }) {
  const resolvedParams = use(params); // Use React.use to resolve the promise
  const [players, setPlayers] = useState(mockPlayers.sort((a, b) => b.score - a.score));
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<typeof mockQuizzes[string] | null>(null);
  const [currentQuizNodeId, setCurrentQuizNodeId] = useState<string | null>(null); // Store nodeId when quiz opens
  const [shortAnswerValue, setShortAnswerValue] = useState(''); // State for short answer input
  const [remainingNodesCount, setRemainingNodesCount] = useState<number | null>(null); // State for remaining nodes
  const [showNodeCount, setShowNodeCount] = useState(true); // State to control node count visibility
  const gameInstanceRef = useRef<Phaser.Game | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const sceneInstanceRef = useRef<MainSceneType | null>(null); // Use the imported type
  const { toast } = useToast(); // Initialize toast
  const shortAnswerInputRef = useRef<HTMLInputElement>(null); // Ref for short answer input
  const isMobile = useIsMobile(); // Check if mobile device
  const joystickManagerRef = useRef<nipplejs.JoystickManager | null>(null);
  const joystickZoneRef = useRef<HTMLDivElement>(null); // Ref for the joystick container


  // Callback function for Phaser scene to trigger quiz
  const handleNodeInteraction: NodeInteractionCallback = (nodeId) => {
    console.log(`React received interaction from node: ${nodeId}`);
    const quizData = mockQuizzes[nodeId];
    if (quizData) {
        setCurrentQuiz(quizData);
        setCurrentQuizNodeId(nodeId); // Store the nodeId associated with this quiz
        setShowQuiz(true);
        setShortAnswerValue(''); // Clear previous short answer

        // --- CRITICAL: Disable Phaser player input when quiz opens ---
        sceneInstanceRef.current?.disablePlayerInput();
        // --- Highlight the node in Phaser ---
        sceneInstanceRef.current?.highlightNode(nodeId);

        // Focus the input field shortly after the modal appears for short answers
        if (quizData.type === 'short-answer') {
             setTimeout(() => shortAnswerInputRef.current?.focus(), 100);
        }
    } else {
        console.warn(`No quiz found for nodeId: ${nodeId}`);
        // If no quiz, immediately signal Phaser to remove the non-interactive node
        // This case might not be desirable, maybe just re-enable? Let's re-enable for now.
        reEnableNode(nodeId);
        // --- Ensure input is enabled if no quiz is shown ---
        sceneInstanceRef.current?.enablePlayerInput();
        sceneInstanceRef.current?.clearNodeHighlight(nodeId); // Clear highlight if no quiz
    }
  };

  // Callback function for Phaser scene to update node count
  const handleNodesCountUpdate: NodesCountCallback = (count) => {
      console.log(`React received nodes count update: ${count}`);
      setRemainingNodesCount(count);
  };


  // Function to signal Phaser to remove a node
  const removeNode = (nodeId: string) => {
    // Ensure scene instance is available before calling method
    if (sceneInstanceRef.current) {
        sceneInstanceRef.current.removeNode(nodeId);
    } else {
        console.warn("Scene instance ref not set, cannot remove node.");
    }
  };

  // Function to signal Phaser to re-enable a node (only used when closing quiz now)
  const reEnableNode = (nodeId: string) => {
       if (sceneInstanceRef.current && typeof sceneInstanceRef.current.reEnableNode === 'function') {
           sceneInstanceRef.current.reEnableNode(nodeId);
           sceneInstanceRef.current.clearNodeHighlight(nodeId); // Also clear highlight
       } else {
           console.warn("Scene instance ref not set or reEnableNode not available, cannot re-enable node.");
       }
   };

    // Function to signal Phaser to start cooldown
    const startInteractionCooldown = (duration: number) => {
        if (sceneInstanceRef.current && typeof sceneInstanceRef.current.startInteractionCooldown === 'function') {
            sceneInstanceRef.current.startInteractionCooldown(duration);
        } else {
            console.warn("Scene instance ref not set or startInteractionCooldown not available.");
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
            // Pass necessary data (mapId, callbacks) to the scene via its constructor or an init method
            const mainSceneInstance = new MainScene();

            const config: Phaser.Types.Core.GameConfig = {
              type: Phaser.AUTO,
              parent: gameContainerRef.current,
              // Use percentages or viewport units for parent container driven size
              width: '100%',
              height: '100%',
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
              input: {
                keyboard: {
                    // Prevent default browser behavior (like scrolling with spacebar)
                    // ONLY if needed and handled carefully. Often not required.
                    // capture: [ Phaser.Input.Keyboard.KeyCodes.SPACE ]
                }
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
                        // Pass both callbacks
                        scene.initScene({ mapId: resolvedParams.mapId }, handleNodeInteraction, handleNodesCountUpdate);
                        sceneInstanceRef.current = scene; // Store the scene instance reference
                        console.log("Scene initialized with data in postBoot.");
                      } else {
                        console.error("MainScene does not have an initScene method.");
                         // Fallback or alternative setup if initScene isn't defined
                         sceneInstanceRef.current = scene;
                         console.warn("Used legacy setInteractionCallback. Consider adding initScene(data, callback, countCallback) to MainScene.");
                      }

                  } else {
                      console.error("MainScene not found after boot. Ensure scene key matches.");
                      // Attempt to get by index if key fails (less reliable)
                      const sceneByIndex = bootedGame.scene.scenes[0];
                       if (sceneByIndex instanceof MainScene && typeof sceneByIndex.initScene === 'function') {
                           sceneByIndex.initScene({ mapId: resolvedParams.mapId }, handleNodeInteraction, handleNodesCountUpdate);
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

        // Check if navigator is defined (runs only on client-side)
        if (typeof navigator !== 'undefined') {
           initPhaser();
        }


        return () => {
          console.log('Destroying Phaser game instance');
          gameInstanceRef.current?.destroy(true);
          gameInstanceRef.current = null;
          sceneInstanceRef.current = null; // Clear scene ref
        };
      // Add resolvedParams to dependencies to re-initialize if it changes (e.g., navigating between maps)
      }, [resolvedParams]);


    // Initialize Joystick for mobile
     useEffect(() => {
        let manager: nipplejs.JoystickManager | null = null;

        const initJoystick = async () => {
            if (isMobile && joystickZoneRef.current && !joystickManagerRef.current) {
                console.log("Initializing joystick...");
                // Dynamically import nipplejs
                const nipplejs = (await import('nipplejs')).default;

                manager = nipplejs.create({
                    zone: joystickZoneRef.current, // The DOM element for the joystick area
                    mode: 'static', // Joystick stays in one place
                    position: { left: '15%', bottom: '20%' }, // Position on screen
                    color: 'rgba(255, 255, 255, 0.5)', // Semi-transparent white
                    size: 100, // Size of the joystick base
                    threshold: 0.1, // Minimum distance threshold to trigger move
                    fadeTime: 250, // Fade time for the joystick appearance
                });

                joystickManagerRef.current = manager;

                manager.on('move', (evt, data) => {
                    // Pass joystick data to Phaser scene
                    if (sceneInstanceRef.current?.joystickInput) {
                         sceneInstanceRef.current.joystickInput(data);
                     } else {
                         console.warn("Scene instance or joystickInput method not available.");
                     }
                });

                manager.on('end', () => {
                     // Signal Phaser scene that joystick is released
                     if (sceneInstanceRef.current?.joystickInput) {
                        sceneInstanceRef.current.joystickInput({
                            vector: { x: 0, y: 0 },
                            force: 0,
                            angle: { radian: 0, degree: 0 },
                            direction: undefined, // Indicate stop
                        });
                     } else {
                         console.warn("Scene instance or joystickInput method not available.");
                     }
                });

                 console.log("Joystick initialized.");
            }
        };

        initJoystick();

        return () => {
            if (joystickManagerRef.current) {
                console.log("Destroying joystick...");
                joystickManagerRef.current.destroy();
                joystickManagerRef.current = null;
            }
        };
     }, [isMobile]); // Re-run if isMobile changes (though unlikely during component lifetime)

    const submitShortAnswer = () => {
        handleAnswerSubmit(shortAnswerValue);
    }

    const handleShortAnswerKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        // Allow spacebar
        if (event.key === ' ') {
            // Default behavior is fine, no preventDefault needed usually
             event.stopPropagation(); // Ensure space doesn't bubble up to Phaser if needed
        }
        // Submit on Enter
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent form submission if it's in a form
            submitShortAnswer();
        }
        // Prevent WASD from propagating to Phaser while typing
        if (['w', 'a', 's', 'd', 'W', 'A', 'S', 'D', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
             event.stopPropagation();
        }
    };

    const handleAnswerSubmit = (selectedAnswer: string) => {
      console.log('Answer submitted:', selectedAnswer);
      if (!currentQuiz || !currentQuizNodeId) return; // Ensure we have quiz and node ID

      const isCorrect = selectedAnswer.trim().toLowerCase() === currentQuiz.correctAnswer.toLowerCase(); // Trim and ignore case for short answers

      // Display feedback toast
      toast({
          title: isCorrect ? "Correct!" : "Wrong!",
          description: isCorrect ? "Good job!" : `The correct answer was: ${currentQuiz.correctAnswer}`,
          variant: isCorrect ? "default" : "destructive", // Use default (usually green/blue) for correct, destructive (red) for wrong
      });

      // Update player score only if correct
      if (isCorrect) {
          console.log("Correct!");
          setPlayers(prevPlayers => prevPlayers.map(p =>
              p.name === 'You' ? { ...p, score: p.score + 10 } : p
          ).sort((a, b) => b.score - a.score));
      } else {
          console.log("Incorrect!");
          // No score update for wrong answers
      }

      // --- CRITICAL: Remove the node from Phaser REGARDLESS of the answer ---
      removeNode(currentQuizNodeId);

      setShowQuiz(false); // Hide quiz after answering

       // --- CRITICAL: Re-enable Phaser player input ---
       sceneInstanceRef.current?.enablePlayerInput();

      setCurrentQuiz(null); // Reset current quiz
      setCurrentQuizNodeId(null); // Reset current node ID
      setShortAnswerValue(''); // Clear short answer input
  };

  const closeQuiz = () => {
      setShowQuiz(false);
      // If quiz is closed without answering, we need to re-enable the node
      // and start the interaction cooldown.
      console.log("Quiz closed without answering.");

      if (currentQuizNodeId && sceneInstanceRef.current) {
         // Re-enable the node's physics body
         reEnableNode(currentQuizNodeId); // This now also clears highlight

         // Start the interaction cooldown in Phaser
         startInteractionCooldown(1500); // 1.5 seconds cooldown

      } else {
          console.warn("Could not find node ID to re-enable/apply cooldown.");
      }


        // --- CRITICAL: Re-enable Phaser player input ---
       sceneInstanceRef.current?.enablePlayerInput();

      setCurrentQuiz(null);
      setCurrentQuizNodeId(null);
      setShortAnswerValue(''); // Clear short answer input
  }

  const toggleNodeCountVisibility = () => {
    setShowNodeCount(prevState => !prevState);
  }

  return (
    // Make the main container flex column and take full screen height minus header (approx)
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      {/* Removed container/padding from main to allow game to fill space */}
      <main className="flex-grow relative"> {/* Added relative positioning */}
        {/* Game Area - Now takes up the majority of the space */}
        <div
          ref={gameContainerRef}
          id="phaser-game-container"
          // Use absolute positioning or flex-grow to fill the main area
          className="absolute inset-0 bg-muted border border-muted-foreground overflow-hidden" // Fill parent 'main'
        >
          {/* Phaser canvas will be injected here */}
        </div>

        {/* Mobile Joystick Area - Positioned over the game area */}
         {isMobile && (
            <div
              ref={joystickZoneRef}
              id="joystick-zone"
              className="absolute bottom-0 left-0 w-1/2 h-1/2 z-30" // Position bottom-left, adjust size as needed
              style={{ pointerEvents: showQuiz ? 'none' : 'auto' }} // Disable joystick when quiz is shown
            >
              {/* Joystick will be created here by nipplejs */}
            </div>
         )}

         {/* Top-Left HUD Elements Container */}
         <div className="absolute top-4 left-4 z-10 flex flex-col gap-4"> {/* Use flex-col and gap */}

            {/* Map Details Overlay */}
            <div className="bg-background/70 backdrop-blur-sm p-3 rounded-lg shadow">
              <h1 className="text-lg font-bold text-primary">Map: {resolvedParams ? decodeURIComponent(resolvedParams.mapId) : 'Loading...'}</h1>
              <p className="text-xs text-muted-foreground">Room Code: <span className="font-mono bg-muted px-1 py-0.5 rounded">XYZ123</span></p>
            </div>

            {/* Node Count and Toggle Button Overlay */}
            <div className="bg-background/70 backdrop-blur-sm p-3 rounded-lg shadow flex flex-col items-start gap-2"> {/* items-start to align content left */}
                {/* Node Count Display */}
                {showNodeCount && (
                    <div className="flex items-center gap-2">
                        <CheckSquare className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium">Nodes Remaining:</span>
                        <span className="font-bold text-lg text-primary">
                            {remainingNodesCount !== null ? remainingNodesCount : '--'}
                        </span>
                    </div>
                )}
                {/* Show/Hide Node Count Button */}
                <Button
                    variant="ghost"
                    size="sm" // Make button smaller
                    onClick={toggleNodeCountVisibility}
                    className="w-full text-primary hover:bg-background/90 flex items-center justify-center gap-1" // Removed mt-1 as gap handles spacing
                    title={showNodeCount ? "Hide Node Count" : "Show Node Count"}
                    >
                    {showNodeCount ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="text-xs">{showNodeCount ? "Hide" : "Show"} Count</span>
                </Button>
            </div>

         </div>


        {/* Sidebar - Leaderboard as HUD Overlay */}
        <div className="absolute top-4 right-4 z-10 w-64"> {/* Adjust width as needed */}
            <Card className="bg-background/70 backdrop-blur-sm shadow-lg border-primary/50"> {/* Semi-transparent HUD */}
            <CardHeader className="p-3"> {/* Reduced padding */}
                <CardTitle className="text-base flex items-center gap-2"> {/* Smaller title */}
                   <Trophy className="h-4 w-4 text-primary" /> Leaderboard
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0"> {/* Remove padding to let ScrollArea handle it */}
                {/* Adjust height - make it dynamic or fixed height */}
                <ScrollArea className="h-60 px-3 pb-3"> {/* Fixed height example, adjust as needed */}
                <ul className="space-y-2">
                    {players.map((player, index) => (
                    <li key={player.id} className="flex items-center justify-between p-1.5 rounded text-xs hover:bg-secondary/80 transition-colors"> {/* Smaller text, padding */}
                        <div className="flex items-center gap-2">
                        <span className="font-semibold w-5 text-center text-muted-foreground">{index + 1}</span>
                        <Avatar className="h-6 w-6"> {/* Smaller avatar */}
                            <AvatarImage src={player.avatar} alt={player.name} />
                            <AvatarFallback>{player.name.substring(0, 1)}</AvatarFallback>
                        </Avatar>
                        <span className={`flex-1 truncate ${player.name === 'You' ? 'font-bold text-primary' : ''}`}>{player.name}</span>
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
            <div className="absolute inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-20 p-4"> {/* Increased z-index */}
                <Card className="w-full max-w-lg shadow-xl border-primary border-2"> {/* Added primary border */}
                    <CardHeader>
                        <div className="flex justify-between items-center">
                           <div>
                                <CardTitle className="text-primary flex items-center gap-2">
                                    <Target className="h-5 w-5"/> {/* Icon for Node */}
                                    {currentQuiz.nodeDescription || "Quiz Time!"} {/* Show node description */}
                                </CardTitle>
                                <CardDescription>Answer the question below.</CardDescription>
                           </div>
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
                             // Use a form for better accessibility and Enter key handling
                            <form onSubmit={(e) => { e.preventDefault(); submitShortAnswer(); }} className="space-y-3">
                                <Input
                                    ref={shortAnswerInputRef} // Add ref
                                    id="short-answer-input"
                                    type="text"
                                    placeholder="Type your answer..."
                                    value={shortAnswerValue}
                                    onChange={(e) => setShortAnswerValue(e.target.value)}
                                    onKeyDown={handleShortAnswerKeyDown} // Add key down handler
                                    className="w-full p-2 border rounded focus:ring-primary focus:border-primary" // Added focus style
                                    autoComplete="off" // Prevent browser autocomplete
                                    aria-label="Short answer input"
                                />
                                <Button type="submit" className="w-full">
                                    Submit
                                </Button>
                            </form>
                        )}
                    {/* TODO: Add rendering for other quiz types */}
                    </CardContent>
                </Card>
            </div>
        )}
      </main>
      {/* Footer removed to maximize game area */}
      {/* <Footer /> */}
    </div>
  );
}


    