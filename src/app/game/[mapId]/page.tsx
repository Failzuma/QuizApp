
'use client';

import React, { useEffect, useRef, useState, use, useMemo, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Trophy, CheckSquare, Eye, EyeOff, PanelTopClose, PanelTopOpen, ZoomIn, ZoomOut, Target, Loader2 } from 'lucide-react';
import type MainSceneType from '@/game/scenes/MainScene';
import type { NodeInteractionCallback, NodesCountCallback } from '@/game/scenes/MainScene';
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import type nipplejs from 'nipplejs';

// --- Dynamic Data Structures (from API) ---
interface Question {
    question_id: number;
    node_id: number;
    question_text: string;
    options: any; // JSON from DB, can be string[] or other structures
    // Correct answer is NOT sent to client
}

// Represents the link between a map node and a specific question
// This will be constructed on the client-side
interface ClientNodeMapping {
    nodeId: string; // The string identifier used in Phaser (e.g., 'node_intro')
    question: Question;
    nodeDescription: string;
}


// --- Mock Data (Players only, quiz data is now dynamic) ---
const mockPlayers = [
  { id: 'player1', name: 'Player One', score: 150, avatar: 'https://picsum.photos/seed/player1/40/40' },
  { id: 'player2', name: 'You', score: 120, avatar: 'https://picsum.photos/seed/you/40/40' },
  { id: 'player3', name: 'Player Three', score: 90, avatar: 'https://picsum.photos/seed/player3/40/40' },
  { id: 'player4', name: 'Another User', score: 75, avatar: 'https://picsum.photos/seed/user4/40/40' },
];

// --- MAIN COMPONENT ---
export default function GamePage({ params }: { params: Promise<{ mapId: string }> }) {
  const resolvedParams = use(params);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // --- State ---
  const [players, setPlayers] = useState(mockPlayers);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuizData, setCurrentQuizData] = useState<ClientNodeMapping | null>(null);
  const [shortAnswerValue, setShortAnswerValue] = useState('');
  const [remainingNodesCount, setRemainingNodesCount] = useState<number | null>(null);
  const [showNodeCount, setShowNodeCount] = useState(true);
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [phaserInitialized, setPhaserInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMapTitle, setCurrentMapTitle] = useState<string>('Loading...');
  const [clientNodeMappings, setClientNodeMappings] = useState<ClientNodeMapping[]>([]);

  // --- Refs ---
  const gameInstanceRef = useRef<Phaser.Game | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const sceneInstanceRef = useRef<MainSceneType | null>(null);
  const shortAnswerInputRef = useRef<HTMLInputElement>(null);
  const joystickManagerRef = useRef<nipplejs.JoystickManager | null>(null);
  const joystickZoneRef = useRef<HTMLDivElement>(null);

  // --- Data Fetching Effect ---
   useEffect(() => {
       const fetchAndSetupQuizData = async () => {
           if (!resolvedParams?.mapId) {
                console.warn("[React] mapId not available for data fetching.");
                return;
           }
           const mapId = resolvedParams.mapId;
           console.log(`[React] Loading data for mapId: ${mapId}`);
           setIsLoading(true);

           try {
                const response = await fetch(`/api/maps/${mapId}/quizzes`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch quizzes: ${response.statusText}`);
                }
                const questionsFromApi: Question[] = await response.json();
                console.log(`[React] Fetched ${questionsFromApi.length} questions for map ${mapId}.`);

                // TODO: This is a critical point. The client needs to map the numeric `node_id` from the questions
                // to the string-based `nodeId` used in the Phaser scene (e.g., 'node_intro').
                // This mapping should ideally come from the database or another API call.
                // For this prototype, we will create a DUMMY MAPPING.
                const dummyMappings = questionsFromApi.map((q, index) => ({
                    nodeId: `node_${q.node_id}`, // e.g., 'node_1', 'node_2'
                    question: q,
                    nodeDescription: `Quiz Node ${q.node_id}`
                }));

                setClientNodeMappings(dummyMappings);
                setCurrentMapTitle(`Map: ${decodeURIComponent(mapId)}`); // Update title
                setRemainingNodesCount(dummyMappings.length); // Set initial count

                // Pass node data to Phaser scene
                if (sceneInstanceRef.current) {
                    const nodeSetupData = dummyMappings.map(m => ({ nodeId: m.nodeId }));
                    sceneInstanceRef.current.setupNodes(nodeSetupData);
                } else {
                     console.warn("[React] Scene instance not ready when map data loaded. Node setup might be delayed.");
                }
                setPhaserInitialized(false); // Allow re-init if map changes

           } catch (error) {
                console.error("[React] Error fetching quiz data:", error);
                toast({ title: "Failed to load map data", description: "Please try again later.", variant: "destructive" });
           } finally {
                setIsLoading(false);
           }
       };

       fetchAndSetupQuizData();
   }, [resolvedParams?.mapId, toast]);

  // --- Callbacks for Phaser ---
  const handleNodeInteraction: NodeInteractionCallback = useCallback((nodeId) => {
    console.log(`[React] Interaction from node: ${nodeId}`);
    const mapping = clientNodeMappings.find(m => m.nodeId === nodeId);

    if (mapping) {
        setCurrentQuizData(mapping);
        setShowQuiz(true);
        setShortAnswerValue('');
        sceneInstanceRef.current?.disablePlayerInput();
        sceneInstanceRef.current?.highlightNode(nodeId);
        if (mapping.question.options?.type === 'Short Answer') {
             setTimeout(() => shortAnswerInputRef.current?.focus(), 100);
        }
    } else {
        console.warn(`[React] No mapping found for nodeId: ${nodeId}`);
        reEnableNode(nodeId);
        sceneInstanceRef.current?.enablePlayerInput();
        sceneInstanceRef.current?.clearNodeHighlight(nodeId);
    }
  }, [clientNodeMappings]);

  const handleNodesCountUpdate: NodesCountCallback = useCallback((count) => {
      setRemainingNodesCount(count);
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    if (sceneInstanceRef.current?.removeNode) {
        sceneInstanceRef.current.removeNode(nodeId);
    }
  }, []);

  const reEnableNode = useCallback((nodeId: string) => {
       if (sceneInstanceRef.current?.reEnableNode) {
           sceneInstanceRef.current.reEnableNode(nodeId);
           sceneInstanceRef.current.clearNodeHighlight(nodeId);
       }
   }, []);

    const startInteractionCooldown = useCallback((duration: number) => {
        if (sceneInstanceRef.current?.startInteractionCooldown) {
            sceneInstanceRef.current.startInteractionCooldown(duration);
        }
    }, []);


  // --- Phaser Game Initialization ---
   useEffect(() => {
        let game: Phaser.Game | null = null;
        const initPhaser = async () => {
            if (!resolvedParams?.mapId || clientNodeMappings.length === 0 || !gameContainerRef.current || phaserInitialized || gameInstanceRef.current) {
              return;
            }
            setPhaserInitialized(true);

            const Phaser = await import('phaser');
            const { default: MainScene } = await import('@/game/scenes/MainScene');
            const mainSceneInstance = new MainScene();

            const config: Phaser.Types.Core.GameConfig = {
              type: Phaser.AUTO,
              parent: gameContainerRef.current,
              width: '100%',
              height: '100%',
              physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
              scene: mainSceneInstance,
              render: { pixelArt: true, antialias: false },
              scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
              input: { keyboard: {}, touch: true },
              callbacks: {
                postBoot: (bootedGame) => {
                  const scene = bootedGame.scene.getScene('MainScene') as MainSceneType;
                  if (scene?.initScene) {
                    scene.initScene(
                        { mapId: resolvedParams.mapId },
                        handleNodeInteraction,
                        handleNodesCountUpdate,
                        clientNodeMappings.map(m => ({ nodeId: m.nodeId }))
                    );
                    sceneInstanceRef.current = scene;
                  } else {
                      console.error("[Phaser Init] MainScene or initScene method not found.");
                  }
                }
              }
            };
            try {
              game = new Phaser.Game(config);
              gameInstanceRef.current = game;
            } catch (error) {
                console.error("[Phaser Init] Error creating Phaser Game instance:", error);
                setPhaserInitialized(false);
            }
        }
        if (typeof window !== 'undefined') initPhaser();

        return () => {
          const destroyTimeout = setTimeout(() => {
              if (gameInstanceRef.current?.destroy) {
                  try {
                    gameInstanceRef.current.destroy(true);
                  } catch (error) {
                      console.error('[Phaser Cleanup] Error during game destruction:', error);
                  } finally {
                     gameInstanceRef.current = null;
                     sceneInstanceRef.current = null;
                     setPhaserInitialized(false);
                  }
              }
          }, 50);
          return () => clearTimeout(destroyTimeout);
        };
      }, [resolvedParams?.mapId, clientNodeMappings, phaserInitialized, handleNodeInteraction, handleNodesCountUpdate]);

    // --- Joystick Initialization ---
     useEffect(() => {
        let manager: nipplejs.JoystickManager | null = null;
        const initJoystick = async () => {
            const zoneElement = joystickZoneRef.current;
            if (isMobile && zoneElement && document.body.contains(zoneElement) && !joystickManagerRef.current) {
                const nipplejs = (await import('nipplejs')).default;
                try {
                    manager = nipplejs.create({
                        zone: zoneElement, mode: 'dynamic', position: { left: '50%', top: '50%' },
                        color: 'rgba(255, 255, 255, 0.5)', size: 100, threshold: 0.1, fadeTime: 250,
                        multitouch: false, restJoystick: true, restOpacity: 0.5, shape: 'circle',
                    });
                    joystickManagerRef.current = manager;
                    manager.on('move', (evt, data) => {
                        if (sceneInstanceRef.current?.joystickInput) sceneInstanceRef.current.joystickInput(data);
                    });
                    manager.on('end', () => {
                         if (sceneInstanceRef.current?.joystickInput) sceneInstanceRef.current.joystickInput({ vector: { x: 0, y: 0 }, force: 0, angle: { radian: 0, degree: 0 }, direction: undefined });
                    });
                } catch (error) { console.error("[Joystick] Error creating joystick instance:", error); }
            }
        };
        const timeoutId = setTimeout(initJoystick, 150);
        return () => {
            clearTimeout(timeoutId);
            if (joystickManagerRef.current) {
                try { joystickManagerRef.current.destroy(); } catch (error) { console.warn("[Joystick] Error destroying joystick:", error); }
                joystickManagerRef.current = null;
            }
        };
     }, [isMobile]);

    // --- Answer Submission & UI Logic ---
    const submitShortAnswer = () => handleAnswerSubmit(shortAnswerValue);

    const handleShortAnswerKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (['w', 'a', 's', 'd', 'W', 'A', 'S', 'D', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.stopPropagation();
        if (event.key === 'Enter') {
            event.preventDefault();
            submitShortAnswer();
        }
    };

    const handleAnswerSubmit = async (selectedAnswer: string) => {
      if (!currentQuizData) return;
      const nodeIdToRemove = currentQuizData.nodeId;
      const token = localStorage.getItem('token');

      try {
        const response = await fetch('/api/quizzes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ question_id: currentQuizData.question.question_id, user_answer: selectedAnswer })
        });
        const result = await response.json();

        toast({
          title: result.is_correct ? "Correct!" : "Wrong!",
          description: result.is_correct ? "Good job!" : `The correct answer was: ${result.correctAnswer}`,
          variant: result.is_correct ? "default" : "destructive",
        });

        if (result.is_correct) {
          setPlayers(prev => prev.map(p => p.name === 'You' ? { ...p, score: p.score + 10 } : p));
        }

      } catch (error) {
         toast({ title: "Error", description: "Could not submit answer.", variant: "destructive"});
      }

      if (nodeIdToRemove) removeNode(nodeIdToRemove);
      setShowQuiz(false);
      sceneInstanceRef.current?.enablePlayerInput();
      setCurrentQuizData(null);
      setShortAnswerValue('');
    };

    const closeQuiz = () => {
      const nodeIdToReEnable = currentQuizData?.nodeId;
      setShowQuiz(false);
      if (nodeIdToReEnable) {
         reEnableNode(nodeIdToReEnable);
         startInteractionCooldown(1500);
      }
      sceneInstanceRef.current?.enablePlayerInput();
      setCurrentQuizData(null);
      setShortAnswerValue('');
    };

    const toggleUIVisibility = () => setIsUIVisible(p => !p);
    const handleZoomIn = () => sceneInstanceRef.current?.zoomIn();
    const handleZoomOut = () => sceneInstanceRef.current?.zoomOut();

    const sortedPlayers = useMemo(() => [...players].sort((a, b) => b.score - a.score), [players]);
    const showHeader = isMobile === undefined || !isMobile;

    // --- Render Logic ---
    if (isLoading) {
        return (
             <div className="flex flex-col h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading Map Data...</p>
             </div>
        )
    }

    return (
    <div className="flex flex-col h-screen overflow-hidden">
      {showHeader && <Header />}
      <main className="flex-grow relative">
        <div ref={gameContainerRef} id="phaser-game-container" className="absolute inset-0 bg-muted border border-muted-foreground overflow-hidden" />

         {isMobile && ( <div ref={joystickZoneRef} id="joystick-zone" className="absolute bottom-0 left-0 w-1/2 h-1/2 z-30 opacity-75" style={{ pointerEvents: isMobile && !showQuiz ? 'auto' : 'none' }} /> )}

        <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
           {isUIVisible && (
             <>
               <Button variant="ghost" size="icon" onClick={handleZoomIn} className="bg-background/70 backdrop-blur-sm text-primary hover:bg-background/90 shadow" title="Zoom In"><ZoomIn className="h-5 w-5" /></Button>
               <Button variant="ghost" size="icon" onClick={handleZoomOut} className="bg-background/70 backdrop-blur-sm text-primary hover:bg-background/90 shadow" title="Zoom Out"><ZoomOut className="h-5 w-5" /></Button>
             </>
           )}
           <Button variant="ghost" size="icon" onClick={toggleUIVisibility} className="bg-background/70 backdrop-blur-sm text-primary hover:bg-background/90 shadow" title={isUIVisible ? "Hide UI" : "Show UI"}>
               {isUIVisible ? <PanelTopClose className="h-5 w-5" /> : <PanelTopOpen className="h-5 w-5" />}
           </Button>
        </div>

         {isUIVisible && (
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-4 w-full max-w-xs sm:max-w-sm">
                <div className="bg-background/70 backdrop-blur-sm p-3 rounded-lg shadow">
                    <h1 className="text-lg font-bold text-primary truncate">{currentMapTitle}</h1>
                    <p className="text-xs text-muted-foreground">Room Code: <span className="font-mono bg-muted px-1 py-0.5 rounded">XYZ123</span></p>
                </div>
                <div className="bg-background/70 backdrop-blur-sm p-3 rounded-lg shadow flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CheckSquare className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium">Nodes Remaining:</span>
                    </div>
                    <span className="font-bold text-lg text-primary">{remainingNodesCount ?? '--'}</span>
                </div>
            </div>
         )}

        {isUIVisible && (
            <div className="absolute top-16 right-4 z-10 w-48 sm:w-56 md:w-64">
                <Card className="bg-background/70 backdrop-blur-sm shadow-lg border-primary/50">
                <CardHeader className="p-2 sm:p-3"><CardTitle className="text-sm sm:text-base flex items-center gap-1 sm:gap-2"><Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-primary" /> Leaderboard</CardTitle></CardHeader>
                <CardContent className="p-0">
                    <div className="h-48 sm:h-60 overflow-y-auto px-2 sm:px-3 pb-2 sm:pb-3">
                        <ul className="space-y-1.5 sm:space-y-2">
                            {sortedPlayers.map((player, index) => (
                            <li key={player.id} className="flex items-center justify-between p-1 sm:p-1.5 rounded text-xs hover:bg-secondary/80 transition-colors">
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                <span className="font-semibold w-4 sm:w-5 text-center text-muted-foreground">{index + 1}</span>
                                <Avatar className="h-5 w-5 sm:h-6 sm:w-6"><AvatarImage src={player.avatar} alt={player.name} data-ai-hint="person avatar"/><AvatarFallback>{player.name.substring(0, 1)}</AvatarFallback></Avatar>
                                <span className={`flex-1 truncate ${player.name === 'You' ? 'font-bold text-primary' : ''}`}>{player.name}</span>
                                </div>
                                <span className="font-semibold text-primary">{player.score} pts</span>
                            </li>
                            ))}
                        </ul>
                    </div>
                </CardContent>
                </Card>
            </div>
        )}

        {showQuiz && currentQuizData && (
            <div className="absolute inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-lg shadow-xl border-primary border-2">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                           <div>
                                <CardTitle className="text-primary flex items-center gap-2"><Target className="h-5 w-5"/>{currentQuizData.nodeDescription || "Quiz Time!"}</CardTitle>
                                <CardDescription>{`Type: ${currentQuizData.question.options?.type || 'Short Answer'}`}</CardDescription>
                           </div>
                        <Button variant="ghost" size="icon" onClick={closeQuiz}><X className="h-5 w-5 text-muted-foreground hover:text-foreground" /></Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                    <p className="mb-6 text-lg font-medium">{currentQuizData.question.question_text}</p>
                        
                        {Array.isArray(currentQuizData.question.options) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {currentQuizData.question.options.map((option, index) => (
                                    <Button key={index} variant="outline" className="justify-start text-left h-auto py-3 hover:bg-accent hover:text-accent-foreground" onClick={() => handleAnswerSubmit(option)}>
                                        {option}
                                    </Button>
                                ))}
                            </div>
                        )}

                        {!currentQuizData.question.options && (
                            <form onSubmit={(e) => { e.preventDefault(); submitShortAnswer(); }} className="space-y-3">
                                <Input
                                    ref={shortAnswerInputRef} id="short-answer-input" type="text"
                                    placeholder="Type your answer..." value={shortAnswerValue}
                                    onChange={(e) => setShortAnswerValue(e.target.value)}
                                    onKeyDown={handleShortAnswerKeyDown} className="w-full p-2 border rounded focus:ring-primary focus:border-primary"
                                    autoComplete="off" aria-label="Short answer input"
                                />
                                <Button type="submit" className="w-full">Submit</Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        )}
      </main>
    </div>
  );
}

