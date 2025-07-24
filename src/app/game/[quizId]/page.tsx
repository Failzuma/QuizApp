
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
  const [currentMapId, setCurrentMapId] = useState<string | null>(null);
  const [currentQuizTitle, setCurrentQuizTitle] = useState<string>('Loading...');
  const [allQuizNodeData, setAllQuizNodeData] = useState<QuizNodeData[]>([]);

  // --- Refs ---
  const gameInstanceRef = useRef<Phaser.Game | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const sceneInstanceRef = useRef<MainSceneType | null>(null);

  // --- Data Fetching Effect ---
   useEffect(() => {
       const fetchQuizAndMapData = async () => {
           if (!quizId) return;
           setIsLoading(true);

           try {
                // 1. Fetch quiz details to find out title and which map to use
                const quizResponse = await fetch(`/api/quizzes/${quizId}`);
                if (!quizResponse.ok) throw new Error('Quiz not found');
                const quizData = await quizResponse.json();
                
                const mapId = quizData.map.map_identifier;
                setCurrentMapId(mapId);
                setCurrentQuizTitle(quizData.title);

                // 2. Fetch all nodes and questions for that specific quiz instance
                const quizQuestionsResponse = await fetch(`/api/quizzes/${quizId}/questions`);
                if (!quizQuestionsResponse.ok) throw new Error(`Failed to fetch quiz questions for ${mapId}`);
                const quizNodesFromApi: QuizNodeData[] = await quizQuestionsResponse.json();
                
                setAllQuizNodeData(quizNodesFromApi);
                setRemainingNodesCount(quizNodesFromApi.length);

           } catch (error: any) {
                console.error("[React] Error fetching quiz data:", error);
                toast({ title: "Failed to load quiz data", description: error.message || "Please try again later.", variant: "destructive" });
           } finally {
                setIsLoading(false);
           }
       };
       fetchQuizAndMapData();
   }, [quizId, toast]);
    
  // --- Game Interaction Callbacks ---
  const handleNodeInteraction: NodeInteractionCallback = useCallback((nodeDbId) => {
    const quizNode = allQuizNodeData.find(n => n.node_id === nodeDbId);
    if (quizNode) {
        setCurrentQuizNode(quizNode);
        setShowQuiz(true);
        setSelectedAnswer(null); // Reset selection
        if (sceneInstanceRef.current) sceneInstanceRef.current.disablePlayerInput();
    } else {
        toast({ title: "Node Error", description: "This node doesn't have a question assigned for this quiz.", variant: "destructive" });
    }
  }, [allQuizNodeData, toast]);

  const handleNodesCountUpdate: NodesCountCallback = useCallback((count) => {
      setRemainingNodesCount(count);
  }, []);

  const removeNodeFromScene = useCallback((nodeDbId: number) => {
    if (sceneInstanceRef.current?.removeNode) {
        sceneInstanceRef.current.removeNode(nodeDbId);
    }
  }, []);

  // --- Phaser Game Initialization ---
   useEffect(() => {
        if (!currentMapId || allQuizNodeData.length === 0 || !gameContainerRef.current || phaserInitialized) {
          return;
        }

        let game: Phaser.Game | null = null;
        const initPhaser = async () => {
            setPhaserInitialized(true);
            const Phaser = await import('phaser');
            const { default: MainScene } = await import('@/game/scenes/MainScene');
            const mainSceneInstance = new MainScene();
            
            // We need to get the actual positions from a different endpoint now
            const nodesPosResponse = await fetch(`/api/maps/${currentMapId}/nodes`);
            const nodesPosData = await nodesPosResponse.json();

            // Create the data structure Phaser needs
            const phaserNodeSetupData: NodeData[] = allQuizNodeData.map(quizNode => {
                const posData = nodesPosData.find((p: any) => p.node_id === quizNode.node_id);
                return {
                    nodeId: quizNode.node_id,
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
                        { mapId: currentMapId! },
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
      }, [currentMapId, allQuizNodeData, phaserInitialized, handleNodeInteraction, handleNodesCountUpdate]);
    
    // --- UI Event Handlers ---
    const handleAnswerSubmit = async () => {
        if (!selectedAnswer || !currentQuizNode) return;
        setIsSubmitting(true);
        
        // This is where you would send the answer to the backend
        // For now, we simulate a check.
        await new Promise(resolve => setTimeout(resolve, 500)); 

        // const isCorrect = selectedAnswer === "CORRECT_ANSWER_FROM_DB";
        // For demonstration, let's just assume it's correct and remove the node.
        // In a real app, you'd fetch the correct answer and compare.
        
        toast({
            title: "Answer Submitted!",
            description: "Your answer has been recorded.", // Or "Correct!" / "Incorrect."
        });
        
        removeNodeFromScene(currentQuizNode.node_id);
        closeQuiz();
        setIsSubmitting(false);
    };

    const closeQuiz = () => {
        if (currentQuizNode) {
            // Re-enable the node in case the user closes without answering
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

    return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <main className="flex-grow relative">
        <div ref={gameContainerRef} id="phaser-game-container" className="absolute inset-0 bg-muted" />
        
        {/* UI Elements */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-4 w-full max-w-xs sm:max-w-sm">
            <div className="bg-background/70 backdrop-blur-sm p-3 rounded-lg shadow">
                <h1 className="text-lg font-bold text-primary truncate">{currentQuizTitle}</h1>
                <p className="text-xs text-muted-foreground">Map: <span className="font-mono bg-muted px-1 py-0.5 rounded">{currentMapId}</span></p>
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
                            <Button variant="outline" onClick={closeQuiz} disabled={isSubmitting}>
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

    