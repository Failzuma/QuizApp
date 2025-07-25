
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckSquare } from 'lucide-react';
import type MainSceneType from '@/game/scenes/MainScene';
import type { NodeInteractionCallback, NodesCountCallback, NodeData } from '@/game/scenes/MainScene';
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"


// Represents a question assigned to a node for this specific quiz
interface QuizNodeData {
    node_id: number;
    question_id: number;
    question_text: string;
    options: { option_id: number; option_text: string }[];
}

// Represents the entire data payload for the game client
interface GameData {
    quiz_id: number;
    title: string;
    description: string | null;
    map_identifier: string;
    questions: QuizNodeData[];
}

// --- MAIN COMPONENT ---
export default function GamePage({ params }: { params: { quizId: string } }) {
  const { quizId } = params;
  const { toast } = useToast();

  // --- State ---
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuizNode, setCurrentQuizNode] = useState<QuizNodeData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [remainingNodesCount, setRemainingNodesCount] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phaserInitialized, setPhaserInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Game data state
  const [gameData, setGameData] = useState<GameData | null>(null);

  // --- Refs ---
  const gameInstanceRef = useRef<Phaser.Game | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const sceneInstanceRef = useRef<MainSceneType | null>(null);

  // --- Data Fetching Effect ---
   useEffect(() => {
       const fetchGameData = async () => {
           if (!quizId) return;
           setIsLoading(true);
           try {
                // Fetch ALL game data in one go from the new endpoint
                const response = await fetch(`/api/quizzes/${quizId}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Quiz not found');
                }
                const data: GameData = await response.json();
                setGameData(data);
                setRemainingNodesCount(data.questions.length);
           } catch (error: any) {
                console.error("[React] Error fetching game data:", error);
                toast({ title: "Failed to load quiz", description: error.message, variant: "destructive" });
           } finally {
                setIsLoading(false);
           }
       };
       fetchGameData();
   }, [quizId, toast]);
    
  // --- Game Interaction Callbacks ---
  const handleNodeInteraction: NodeInteractionCallback = useCallback((nodeDbId) => {
    const quizNode = gameData?.questions.find(n => n.node_id === nodeDbId);
    if (quizNode) {
        setCurrentQuizNode(quizNode);
        setShowQuiz(true);
        setSelectedAnswer(null);
        if (sceneInstanceRef.current) sceneInstanceRef.current.disablePlayerInput();
    } else {
        console.warn(`[React] Interaction with node ${nodeDbId}, but no question data found for this quiz.`);
    }
  }, [gameData]);

  const handleNodesCountUpdate: NodesCountCallback = useCallback((count) => {
      setRemainingNodesCount(count);
  }, []);

  const removeNodeFromScene = useCallback((nodeDbId: number) => {
    if (sceneInstanceRef.current?.removeNode) {
        sceneInstanceRef.current.removeNode(nodeDbId);
        // Also remove from local state to prevent re-interaction
        setGameData(prevData => {
            if (!prevData) return null;
            return {
                ...prevData,
                questions: prevData.questions.filter(q => q.node_id !== nodeDbId)
            };
        });
    }
  }, []);

  // --- Phaser Game Initialization ---
   useEffect(() => {
        if (!gameData || !gameContainerRef.current || phaserInitialized) {
          return;
        }

        let game: Phaser.Game | null = null;
        const initPhaser = async () => {
            setPhaserInitialized(true);
            const Phaser = await import('phaser');
            const { default: MainScene } = await import('@/game/scenes/MainScene');
            const mainSceneInstance = new MainScene();
            
            // We need the node positions from the separate node API
            const nodesPosResponse = await fetch(`/api/maps/${gameData.map_identifier}/nodes`);
            const nodesPosData = await nodesPosResponse.json();

            // Create the data structure Phaser needs, matching questions with their positions
            const phaserNodeSetupData: NodeData[] = gameData.questions.map(qNode => {
                const posData = nodesPosData.find((p: any) => p.node_id === qNode.node_id);
                return {
                    nodeId: qNode.node_id,
                    x: posData?.posX ?? 0,
                    y: posData?.posY ?? 0
                }
            });

            const config: Phaser.Types.Core.GameConfig = {
              type: Phaser.AUTO,
              parent: gameContainerRef.current!,
              width: '100%',
              height: '100%',
              physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
              scene: mainSceneInstance,
              render: { pixelArt: true, antialias: false },
              scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
              callbacks: {
                postBoot: (bootedGame) => {
                  const scene = bootedGame.scene.getScene('MainScene') as MainSceneType;
                  if (scene?.initScene) {
                    scene.initScene(
                        { mapId: gameData.map_identifier },
                        handleNodeInteraction,
                        handleNodesCountUpdate,
                        phaserNodeSetupData
                    );
                    sceneInstanceRef.current = scene;
                  }
                }
              }
            };
            game = new Phaser.Game(config);
            gameInstanceRef.current = game;
        }
        initPhaser();

        return () => {
            gameInstanceRef.current?.destroy(true);
            gameInstanceRef.current = null;
            setPhaserInitialized(false);
        };
      }, [gameData, phaserInitialized, handleNodeInteraction, handleNodesCountUpdate]);
    
    // --- UI Event Handlers ---
    const handleAnswerSubmit = async () => {
        if (!selectedAnswer || !currentQuizNode) return;
        setIsSubmitting(true);
        
        // This is where you would send the answer to the backend
        // For now, we simulate a check.
        await new Promise(resolve => setTimeout(resolve, 500)); 
        
        toast({
            title: "Answer Submitted!",
            description: "Your answer has been recorded.",
        });
        
        removeNodeFromScene(currentQuizNode.node_id);
        closeQuiz(false); // don't re-enable node
        setIsSubmitting(false);
    };

    const closeQuiz = (reEnableNode = true) => {
        if (reEnableNode && currentQuizNode) {
            if(sceneInstanceRef.current) sceneInstanceRef.current.reEnableNode(currentQuizNode.node_id);
        }
        setShowQuiz(false);
        setCurrentQuizNode(null);
        if(sceneInstanceRef.current) sceneInstanceRef.current.enablePlayerInput();
    };


    if (isLoading) {
        return (
             <div className="flex flex-col h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading Quiz...</p>
             </div>
        )
    }
    
    if (!gameData) {
        return (
             <div className="flex flex-col h-screen items-center justify-center">
                <p className="mt-4 text-destructive">Could not load game data. The quiz might not exist or an error occurred.</p>
             </div>
        )
    }

    return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <main className="flex-grow relative">
        <div ref={gameContainerRef} id="phaser-game-container" className="absolute inset-0 bg-muted" />
        
        {/* UI Elements */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-4 w-full max-w-xs sm:max-w-sm">
            <div className="bg-background/70 backdrop-blur-sm p-3 rounded-lg shadow">
                <h1 className="text-lg font-bold text-primary truncate">{gameData.title}</h1>
                <p className="text-xs text-muted-foreground">Map: <span className="font-mono bg-muted px-1 py-0.5 rounded">{gameData.map_identifier}</span></p>
            </div>
            <div className="bg-background/70 backdrop-blur-sm p-3 rounded-lg shadow flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Nodes Remaining:</span>
                </div>
                <span className="font-bold text-lg text-primary">{remainingNodesCount ?? '--'}</span>
            </div>
        </div>
        
        {/* Quiz Modal */}
        {showQuiz && currentQuizNode && (
            <div className="absolute inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <CardTitle>Question</CardTitle>
                        <CardDescription>{currentQuizNode.question_text}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup 
                            value={selectedAnswer ?? undefined} 
                            onValueChange={setSelectedAnswer}
                            className="space-y-2"
                        >
                            {currentQuizNode.options.map(opt => (
                                <div key={opt.option_id} className="flex items-center space-x-2">
                                    <RadioGroupItem value={opt.option_text} id={`opt-${opt.option_id}`} />
                                    <Label htmlFor={`opt-${opt.option_id}`}>{opt.option_text}</Label>
                                </div>
                            ))}
                        </RadioGroup>

                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="outline" onClick={() => closeQuiz(true)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button onClick={handleAnswerSubmit} disabled={!selectedAnswer || isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Submit Answer'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}
      </main>
    </div>
  );
}
