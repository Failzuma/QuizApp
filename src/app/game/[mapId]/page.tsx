

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
import { X, Trophy, Target, CheckSquare, Eye, EyeOff, PanelTopClose, PanelTopOpen } from 'lucide-react'; // Added UI toggle icons
import type MainSceneType from '@/game/scenes/MainScene'; // Import the type only
import type { NodeInteractionCallback, NodesCountCallback } from '@/game/scenes/MainScene'; // Import the types only
import { useToast } from "@/hooks/use-toast"; // Import useToast
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile hook
import type nipplejs from 'nipplejs'; // Import nipplejs type only for type checking

// --- Mock Data Structures (Simulating DB/API Data) ---

interface QuizCollection {
    id: string;
    mapId: string;
    title: string;
    questionIds: string[]; // References questions below
}

// Represents individual questions
interface Question {
    id: string;
    quizId: string; // Link back to the collection
    type: string; // 'multiple-choice', 'short-answer', etc.
    question: string;
    options?: string[]; // Optional, only for certain types
    correctAnswer: string;
    // No nodeId here directly, mapping is separate
}

// Represents the link between a map node and a specific question
interface NodeQuestionMapping {
    mapId: string;
    nodeId: string; // ID of the node in Phaser
    questionId: string; // ID of the question to trigger
    nodeDescription: string; // Description for the quiz modal title
}

// --- Mock Data Implementation ---

const mockQuizzesCollections: QuizCollection[] = [
    { id: 'quiz_map1', mapId: 'map1', title: 'English for IT Basics', questionIds: ['q_map1_1', 'q_map1_2'] },
    { id: 'quiz_map2', mapId: 'map2', title: 'Grammar Tenses', questionIds: ['q_map2_1'] },
    { id: 'quiz_map3', mapId: 'map3', title: 'Networking Concepts', questionIds: ['q_map3_1'] }, // Added for map3
    // Add more quiz collections as needed
];

const mockAllQuestions: Question[] = [
    // Questions for map1
    { id: 'q_map1_1', quizId: 'quiz_map1', type: 'multiple-choice', question: 'Which HTML tag is used for the largest heading?', options: ['<h1>', '<h6>', '<head>', '<p>'], correctAnswer: '<h1>' },
    { id: 'q_map1_2', quizId: 'quiz_map1', type: 'short-answer', question: 'What does CSS stand for?', correctAnswer: 'Cascading Style Sheets' },
    // Questions for map2
    { id: 'q_map2_1', quizId: 'quiz_map2', type: 'multiple-choice', question: 'Choose the correct past tense of "go".', options: ['go', 'went', 'gone', 'goes'], correctAnswer: 'went' },
    // Questions for map3
    { id: 'q_map3_1', quizId: 'quiz_map3', type: 'short-answer', question: 'What does LAN stand for?', correctAnswer: 'Local Area Network'},
    // Add more questions
];

const mockNodeQuestionMappings: NodeQuestionMapping[] = [
    // Map 1 nodes
    { mapId: 'map1', nodeId: 'node_html_heading', questionId: 'q_map1_1', nodeDescription: 'HTML Heading Node' },
    { mapId: 'map1', nodeId: 'node_css_acronym', questionId: 'q_map1_2', nodeDescription: 'CSS Acronym Node' },
    // Map 2 nodes
    { mapId: 'map2', nodeId: 'node_tense_go', questionId: 'q_map2_1', nodeDescription: 'Past Tense Node (Go)' },
    // Map 3 nodes
    { mapId: 'map3', nodeId: 'node_lan', questionId: 'q_map3_1', nodeDescription: 'LAN Acronym Node'},
    // Add more mappings
];

// --- End Mock Data ---


// Mock Data - Players (Keep as is for now)
const mockPlayers = [
  { id: 'player1', name: 'Player One', score: 150, avatar: 'https://picsum.photos/seed/player1/40/40' },
  { id: 'player2', name: 'You', score: 120, avatar: 'https://picsum.photos/seed/you/40/40' },
  { id: 'player3', name: 'Player Three', score: 90, avatar: 'https://picsum.photos/seed/player3/40/40' },
  { id: 'player4', name: 'Another User', score: 75, avatar: 'https://picsum.photos/seed/user4/40/40' },
];

export default function GamePage({ params }: { params: Promise<{ mapId: string }> }) {
  const resolvedParams = use(params); // Use React.use to resolve the promise
  const [players, setPlayers] = useState(mockPlayers.sort((a, b) => b.score - a.score));
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuizData, setCurrentQuizData] = useState<{ question: Question; nodeDescription: string; } | null>(null); // Holds the full Question object and node description
  const [currentQuizNodeId, setCurrentQuizNodeId] = useState<string | null>(null); // Store nodeId when quiz opens
  const [shortAnswerValue, setShortAnswerValue] = useState(''); // State for short answer input
  const [remainingNodesCount, setRemainingNodesCount] = useState<number | null>(null); // State for remaining nodes
  const [showNodeCount, setShowNodeCount] = useState(true); // State to control node count visibility
  const [isUIVisible, setIsUIVisible] = useState(true); // State to control overall UI visibility
  const gameInstanceRef = useRef<Phaser.Game | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const sceneInstanceRef = useRef<MainSceneType | null>(null); // Use the imported type
  const { toast } = useToast(); // Initialize toast
  const shortAnswerInputRef = useRef<HTMLInputElement>(null); // Ref for short answer input
  const isMobile = useIsMobile(); // Check if mobile device
  const joystickManagerRef = useRef<nipplejs.JoystickManager | null>(null);
  const joystickZoneRef = useRef<HTMLDivElement>(null); // Ref for the joystick container

  // State for map-specific data
  const [currentMapQuestions, setCurrentMapQuestions] = useState<Question[]>([]);
  const [currentNodeMappings, setCurrentNodeMappings] = useState<NodeQuestionMapping[]>([]);
  const [currentMapTitle, setCurrentMapTitle] = useState<string>('Loading...');

   // Effect to load map-specific data when mapId changes
   useEffect(() => {
       if (resolvedParams?.mapId) {
           const mapId = resolvedParams.mapId;
           console.log(`[React] Loading data for mapId: ${mapId}`);

           // 1. Find the Quiz Collection for this map
           const quizCollection = mockQuizzesCollections.find(qc => qc.mapId === mapId);
           setCurrentMapTitle(quizCollection?.title || `Map: ${decodeURIComponent(mapId)}`);

           // 2. Filter Questions belonging to this map's quiz collection
           const questionIdsForMap = quizCollection?.questionIds || [];
           const questions = mockAllQuestions.filter(q => questionIdsForMap.includes(q.id));
           setCurrentMapQuestions(questions);
           console.log(`[React] Found ${questions.length} questions for map ${mapId}`);

           // 3. Filter Node Mappings for this map
           const mappings = mockNodeQuestionMappings.filter(nm => nm.mapId === mapId);
           setCurrentNodeMappings(mappings);
           console.log(`[React] Found ${mappings.length} node mappings for map ${mapId}`);

           // Pass node data to Phaser scene (if scene is ready)
           if (sceneInstanceRef.current) {
               sceneInstanceRef.current.setupNodes(mappings.map(m => ({ nodeId: m.nodeId, x: 0, y: 0 }))); // Pass node IDs (adjust x/y if needed)
               setRemainingNodesCount(mappings.length); // Initial count
           } else {
               // If scene isn't ready yet, initial count might be set later in postBoot or initScene
                setRemainingNodesCount(mappings.length);
               console.warn("[React] Scene instance not ready when map data loaded. Node setup might be delayed.");
           }

       } else {
            console.warn("[React] mapId not available yet for data loading.");
            setCurrentMapTitle('Map Loading...');
            setCurrentMapQuestions([]);
            setCurrentNodeMappings([]);
            setRemainingNodesCount(null);
       }
   }, [resolvedParams?.mapId]); // Dependency on resolved mapId


  // Callback function for Phaser scene to trigger quiz
  const handleNodeInteraction: NodeInteractionCallback = (nodeId) => {
    console.log(`[React] Received interaction from node: ${nodeId}`);

    // Find the mapping for this nodeId on the current map
    const mapping = currentNodeMappings.find(nm => nm.nodeId === nodeId);

    if (mapping) {
        // Find the actual question data using the questionId from the mapping
        const questionData = currentMapQuestions.find(q => q.id === mapping.questionId);

        if (questionData) {
            setCurrentQuizData({ question: questionData, nodeDescription: mapping.nodeDescription });
            setCurrentQuizNodeId(nodeId); // Store the nodeId associated with this quiz
            setShowQuiz(true);
            setShortAnswerValue(''); // Clear previous short answer

            // --- CRITICAL: Disable Phaser player input when quiz opens ---
            console.log("[React] Disabling player input for quiz.");
            sceneInstanceRef.current?.disablePlayerInput();
            // --- Highlight the node in Phaser ---
            sceneInstanceRef.current?.highlightNode(nodeId);

            // Focus the input field shortly after the modal appears for short answers
            if (questionData.type === 'short-answer') {
                 setTimeout(() => shortAnswerInputRef.current?.focus(), 100);
            }
        } else {
            console.warn(`[React] Question data not found for questionId: ${mapping.questionId} (linked to nodeId: ${nodeId})`);
            // Handle missing question data - maybe re-enable node?
             reEnableNode(nodeId);
             console.log("[React] Enabling player input as question data was not found.");
             sceneInstanceRef.current?.enablePlayerInput();
             sceneInstanceRef.current?.clearNodeHighlight(nodeId);
        }
    } else {
        console.warn(`[React] No node mapping found for nodeId: ${nodeId} on map ${resolvedParams?.mapId}`);
        // If no mapping, re-enable node and player input
        reEnableNode(nodeId);
        console.log("[React] Enabling player input as no node mapping was found.");
        sceneInstanceRef.current?.enablePlayerInput();
        sceneInstanceRef.current?.clearNodeHighlight(nodeId);
    }
  };

  // Callback function for Phaser scene to update node count
  const handleNodesCountUpdate: NodesCountCallback = (count) => {
      console.log(`[React] Received nodes count update: ${count}`);
      setRemainingNodesCount(count);
  };


  // Function to signal Phaser to remove a node
  const removeNode = (nodeId: string) => {
    // Ensure scene instance is available before calling method
    console.log(`[React] Requesting removal of node: ${nodeId}`);
    if (sceneInstanceRef.current && typeof sceneInstanceRef.current.removeNode === 'function') {
        sceneInstanceRef.current.removeNode(nodeId);
    } else {
        console.warn("[React] Scene instance ref not set or removeNode not available, cannot remove node.");
    }
  };

  // Function to signal Phaser to re-enable a node (only used when closing quiz now)
  const reEnableNode = (nodeId: string) => {
        console.log(`[React] Requesting re-enable of node: ${nodeId}`);
       if (sceneInstanceRef.current && typeof sceneInstanceRef.current.reEnableNode === 'function') {
           sceneInstanceRef.current.reEnableNode(nodeId);
           sceneInstanceRef.current.clearNodeHighlight(nodeId); // Also clear highlight
       } else {
           console.warn("[React] Scene instance ref not set or reEnableNode not available, cannot re-enable node.");
       }
   };

    // Function to signal Phaser to start cooldown
    const startInteractionCooldown = (duration: number) => {
        console.log(`[React] Requesting interaction cooldown start: ${duration}ms`);
        if (sceneInstanceRef.current && typeof sceneInstanceRef.current.startInteractionCooldown === 'function') {
            sceneInstanceRef.current.startInteractionCooldown(duration);
        } else {
            console.warn("[React] Scene instance ref not set or startInteractionCooldown not available.");
        }
    };


  // Initialize Phaser Game
   useEffect(() => {
        let game: Phaser.Game | null = null;

        const initPhaser = async () => {
            // Ensure we have the mapId AND node mappings before initializing Phaser
            // This prevents Phaser from starting before React knows which nodes to create
            if (!resolvedParams?.mapId || currentNodeMappings.length === 0 || !gameContainerRef.current || gameInstanceRef.current) {
              console.log("[Phaser Init] Skipping initialization: missing params, node mappings, container, or game already exists.");
              return;
            }
            console.log("[Phaser Init] Starting initialization...");

            // Dynamically import Phaser and the Scene
            const Phaser = await import('phaser');
            const { default: MainScene } = await import('@/game/scenes/MainScene');

            // Create the scene instance *before* the game config
            // Pass necessary data (mapId, callbacks, NODE DATA) to the scene via its constructor or an init method
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
                },
                 // Enable touch input for mobile gestures
                touch: true,
              },
              // Use postBoot to safely access the scene instance after Phaser setup
              callbacks: {
                postBoot: (bootedGame) => {
                   console.log("[Phaser Init] postBoot callback triggered.");
                  // Access the scene instance using the key provided in its constructor (default is the class name)
                  const scene = bootedGame.scene.getScene('MainScene') as MainSceneType; // Cast to the imported type
                  if (scene) {
                      // Initialize the scene with mapId, callbacks, AND NODE DATA after it's ready
                      if (typeof scene.initScene === 'function') {
                        console.log("[Phaser Init] Calling initScene with mapId, callbacks, and node mappings.");
                        // Pass node mappings along with other data
                        scene.initScene(
                            { mapId: resolvedParams.mapId },
                            handleNodeInteraction,
                            handleNodesCountUpdate,
                            // Pass node IDs and potentially initial positions if known
                            // Adjust this based on how MainScene.ts expects node data
                            currentNodeMappings.map(m => ({ nodeId: m.nodeId /*, x: ..., y: ... */ }))
                        );
                        sceneInstanceRef.current = scene; // Store the scene instance reference
                        console.log("[Phaser Init] Scene initialized successfully in postBoot.");
                        // Initial node count might be updated within initScene/create now
                      } else {
                        console.error("[Phaser Init] MainScene does not have an initScene method supporting node data.");
                         sceneInstanceRef.current = scene;
                         console.warn("[Phaser Init] Consider updating initScene in MainScene.ts to accept node data.");
                      }

                  } else {
                      console.error("[Phaser Init] MainScene not found after boot. Ensure scene key matches.");
                       // Attempt to get by index if key fails (less reliable)
                       const sceneByIndex = bootedGame.scene.scenes[0];
                       if (sceneByIndex instanceof MainScene && typeof sceneByIndex.initScene === 'function') {
                           console.log("[Phaser Init] Found scene by index, calling initScene.");
                           sceneByIndex.initScene(
                               { mapId: resolvedParams.mapId },
                               handleNodeInteraction,
                               handleNodesCountUpdate,
                               currentNodeMappings.map(m => ({ nodeId: m.nodeId }))
                            );
                           sceneInstanceRef.current = sceneByIndex;
                           console.log("[Phaser Init] Scene initialized via index in postBoot.");
                       } else {
                          console.error("[Phaser Init] Could not get scene instance by key or index, or initScene missing/incorrect.");
                       }
                  }
                }
              }
            };
            console.log("[Phaser Init] Creating Phaser.Game instance.");
            game = new Phaser.Game(config);
            gameInstanceRef.current = game;
        }

        // Check if navigator is defined (runs only on client-side)
        if (typeof navigator !== 'undefined') {
           console.log("[Phaser Init] Running on client, calling initPhaser.");
           initPhaser();
        } else {
            console.log("[Phaser Init] Running on server or navigator undefined, skipping initPhaser.");
        }


        return () => {
          console.log('[Phaser Cleanup] Destroying Phaser game instance...');
          gameInstanceRef.current?.destroy(true);
          gameInstanceRef.current = null;
          sceneInstanceRef.current = null; // Clear scene ref
          console.log('[Phaser Cleanup] Phaser game instance destroyed.');
        };
      // Add resolvedParams AND currentNodeMappings to dependencies
      // This ensures Phaser re-initializes if the map changes OR if the node data loads *after* the initial render
      }, [resolvedParams?.mapId, currentNodeMappings]);


    // Initialize Joystick for mobile
     useEffect(() => {
        let manager: nipplejs.JoystickManager | null = null;

        const initJoystick = async () => {
            // Only init joystick if on mobile and UI is generally visible (otherwise zone might be hidden)
            if (isMobile && joystickZoneRef.current && !joystickManagerRef.current && isUIVisible) {
                console.log("[Joystick] Initializing joystick...");
                // Dynamically import nipplejs
                const nipplejs = (await import('nipplejs')).default;

                manager = nipplejs.create({
                    zone: joystickZoneRef.current, // The DOM element for the joystick area
                    mode: 'dynamic', // Allows joystick to appear where finger touches
                    position: { left: '50%', top: '50%' }, // Centered in the zone initially
                    color: 'rgba(255, 255, 255, 0.5)', // Semi-transparent white
                    size: 100, // Size of the joystick base
                    threshold: 0.1, // Minimum distance threshold to trigger move
                    fadeTime: 250, // Fade time for the joystick appearance
                    multitouch: false, // Disable multitouch for simplicity with zoom
                    restJoystick: true, // Return to center when released
                    restOpacity: 0.5, // Opacity when idle
                    // lockX: false, // Allow diagonal movement
                    // lockY: false,
                    shape: 'circle', // Or 'square'
                });

                joystickManagerRef.current = manager;

                manager.on('start', (evt, data) => {
                    console.log("[Joystick] Start");
                    // Optional: visually indicate joystick is active
                });

                manager.on('move', (evt, data) => {
                    // Pass joystick data to Phaser scene
                    if (sceneInstanceRef.current?.joystickInput) {
                         sceneInstanceRef.current.joystickInput(data);
                     } else {
                         // console.warn("[Joystick] Scene instance or joystickInput method not available during move."); // Can be noisy
                     }
                });

                manager.on('end', () => {
                     console.log("[Joystick End]");
                     // Signal Phaser scene that joystick is released
                     if (sceneInstanceRef.current?.joystickInput) {
                        sceneInstanceRef.current.joystickInput({
                            vector: { x: 0, y: 0 },
                            force: 0,
                            angle: { radian: 0, degree: 0 },
                            direction: undefined, // Indicate stop
                        });
                     } else {
                         // console.warn("[Joystick] Scene instance or joystickInput method not available during end.");
                     }
                     // Optional: visually indicate joystick is inactive
                });

                 console.log("[Joystick] Joystick initialized.");
            } else if (!isUIVisible && joystickManagerRef.current) {
                 // Destroy joystick if UI becomes hidden
                 console.log("[Joystick] UI hidden, destroying joystick.");
                 joystickManagerRef.current.destroy();
                 joystickManagerRef.current = null;
            }
        };

        // Only init if we are on the client
        if (typeof window !== 'undefined') {
            initJoystick();
        }


        return () => {
            if (joystickManagerRef.current) {
                console.log("[Joystick] Destroying joystick (cleanup)...");
                try {
                    joystickManagerRef.current.destroy();
                } catch (error) {
                     console.warn("[Joystick] Error destroying joystick:", error);
                } finally {
                     joystickManagerRef.current = null;
                }

            }
        };
     // Re-run if isMobile changes or UI visibility changes
     }, [isMobile, isUIVisible]);

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
      console.log(`[React] Answer submitted: "${selectedAnswer}". Current quiz node ID: ${currentQuizNodeId}`);
      if (!currentQuizData?.question || !currentQuizNodeId) {
          console.error("[React] Cannot submit answer: currentQuizData or currentQuizNodeId is null.");
          return;
      }

      // Capture nodeId before state potentially changes
      const nodeIdToRemove = currentQuizNodeId;
      const questionDetails = currentQuizData.question;

      const isCorrect = selectedAnswer.trim().toLowerCase() === questionDetails.correctAnswer.toLowerCase(); // Trim and ignore case for short answers

      // Display feedback toast
      toast({
          title: isCorrect ? "Correct!" : "Wrong!",
          description: isCorrect ? "Good job!" : `The correct answer was: ${questionDetails.correctAnswer}`,
          variant: isCorrect ? "default" : "destructive", // Use default (usually green/blue) for correct, destructive (red) for wrong
      });

      // Update player score only if correct
      if (isCorrect) {
          console.log("[React] Answer Correct!");
          setPlayers(prevPlayers => prevPlayers.map(p =>
              p.name === 'You' ? { ...p, score: p.score + 10 } : p
          ).sort((a, b) => b.score - a.score));
      } else {
          console.log("[React] Answer Incorrect!");
          // No score update for wrong answers
      }

      // --- CRITICAL: Remove the node from Phaser REGARDLESS of the answer ---
      // Ensure we have the nodeId captured before resetting state
      if (nodeIdToRemove) {
          removeNode(nodeIdToRemove);
      } else {
          console.error("[React] Could not remove node because nodeIdToRemove was null!");
      }

      // Hide quiz UI
      setShowQuiz(false);

       // --- CRITICAL: Re-enable Phaser player input ---
       console.log("[React] Re-enabling player input after quiz submission.");
       sceneInstanceRef.current?.enablePlayerInput();

       // Reset quiz state AFTER ensuring node removal was requested
      setCurrentQuizData(null); // Reset full quiz data
      setCurrentQuizNodeId(null); // Reset current node ID
      setShortAnswerValue(''); // Clear short answer input
  };

  const closeQuiz = () => {
      // Capture node ID before resetting
      const nodeIdToReEnable = currentQuizNodeId;
      console.log(`[React] Quiz closed without answering. Node to potentially re-enable: ${nodeIdToReEnable}`);

      setShowQuiz(false);

      // If quiz is closed without answering, we need to re-enable the node
      // and start the interaction cooldown.
      if (nodeIdToReEnable && sceneInstanceRef.current) {
         // Re-enable the node's physics body
         reEnableNode(nodeIdToReEnable); // This now also clears highlight

         // Start the interaction cooldown in Phaser
         startInteractionCooldown(1500); // 1.5 seconds cooldown

      } else {
          console.warn("[React] Could not find node ID to re-enable/apply cooldown, or scene ref missing.");
      }

        // --- CRITICAL: Re-enable Phaser player input ---
       console.log("[React] Re-enabling player input after closing quiz.");
       sceneInstanceRef.current?.enablePlayerInput();

       // Reset quiz state
      setCurrentQuizData(null); // Reset full quiz data
      setCurrentQuizNodeId(null);
      setShortAnswerValue(''); // Clear short answer input
  }

  const toggleNodeCountVisibility = () => {
    setShowNodeCount(prevState => !prevState);
  }

  const toggleUIVisibility = () => {
      setIsUIVisible(prevState => !prevState);
  }

  return (
    // Make the main container flex column and take full screen height minus header (approx)
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Conditionally render Header based on device type */}
      {!isMobile && <Header />}
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
         {isMobile && isUIVisible && ( // Only show if mobile AND UI is visible
            <div
              ref={joystickZoneRef}
              id="joystick-zone"
              className="absolute bottom-0 left-0 w-1/2 h-1/2 z-30" // Position bottom-left, adjust size as needed
              style={{ pointerEvents: showQuiz ? 'none' : 'auto' }} // Disable joystick when quiz is shown
            >
              {/* Joystick will be created here by nipplejs dynamically */}
            </div>
         )}

        {/* Top Control Bar (Contains UI Toggle) - Positioned Above Other UI */}
        <div className="absolute top-4 right-4 z-20"> {/* Ensure it's above other overlays */}
           <Button
               variant="ghost"
               size="icon"
               onClick={toggleUIVisibility}
               className="bg-background/70 backdrop-blur-sm text-primary hover:bg-background/90 shadow"
               title={isUIVisible ? "Hide UI" : "Show UI"}
            >
               {isUIVisible ? <PanelTopClose className="h-5 w-5" /> : <PanelTopOpen className="h-5 w-5" />}
           </Button>
        </div>

         {/* Top-Left HUD Elements Container - Visibility controlled by isUIVisible */}
         {isUIVisible && (
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-4"> {/* Use flex-col and gap */}

                {/* Map Details Overlay */}
                <div className="bg-background/70 backdrop-blur-sm p-3 rounded-lg shadow">
                <h1 className="text-lg font-bold text-primary">{currentMapTitle}</h1>
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
         )}


        {/* Sidebar - Leaderboard as HUD Overlay - Visibility controlled by isUIVisible */}
        {isUIVisible && (
            <div className="absolute top-16 right-4 z-10 w-64"> {/* Adjust top offset due to UI toggle button */}
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
                                <AvatarImage src={player.avatar} alt={player.name} data-ai-hint="person avatar"/>
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
        )}

        {/* Quiz Modal/Overlay */}
        {showQuiz && currentQuizData?.question && (
            <div className="absolute inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-50 p-4"> {/* Increased z-index above UI toggle */}
                <Card className="w-full max-w-lg shadow-xl border-primary border-2"> {/* Added primary border */}
                    <CardHeader>
                        <div className="flex justify-between items-center">
                           <div>
                                <CardTitle className="text-primary flex items-center gap-2">
                                    <Target className="h-5 w-5"/> {/* Icon for Node */}
                                    {currentQuizData.nodeDescription || "Quiz Time!"} {/* Show node description */}
                                </CardTitle>
                                <CardDescription>Answer the question below.</CardDescription>
                           </div>
                        <Button variant="ghost" size="icon" onClick={closeQuiz}>
                            <X className="h-5 w-5 text-muted-foreground hover:text-foreground" /> {/* Styled close button */}
                        </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                    <p className="mb-6 text-lg font-medium">{currentQuizData.question.question}</p> {/* Increased margin */}
                        {currentQuizData.question.type === 'multiple-choice' && currentQuizData.question.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {currentQuizData.question.options.map((option, index) => (
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
                        {currentQuizData.question.type === 'short-answer' && (
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
                    {/* TODO: Add rendering for other quiz types (Matching, etc.) */}
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

