
'use client';

import React, { useEffect, useRef, useState, use, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Trophy, CheckSquare, PanelTopClose, PanelTopOpen, ZoomIn, ZoomOut, Target, Loader2 } from 'lucide-react';
import type MainSceneType from '@/game/scenes/MainScene';
import type { NodeInteractionCallback, NodesCountCallback, NodeData } from '@/game/scenes/MainScene';
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import type nipplejs from 'nipplejs';

// Represents a question from the API for a specific node
interface Question {
    question_id: number;
    question_text: string;
    options: any; 
}

// Represents a node from the DB, including its questions
interface NodeWithQuiz extends NodeData {
    node_id: number;
    title: string | null;
    posX: number | null;
    posY: number | null;
    questions: Question[];
}

// Represents the client-side mapping for a specific question triggered by a node
interface ClientNodeMapping {
    nodeDbId: number; 
    question: Question;
    nodeDescription: string;
}

// --- MAIN COMPONENT ---
// The param is now quizId
export default function GamePage({ params }: { params: { quizId: string } }) {
  const { quizId } = params;
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // --- State ---
  const [players, setPlayers] = useState([]); // Real-time players will be implemented later
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuizData, setCurrentQuizData] = useState<ClientNodeMapping | null>(null);
  const [shortAnswerValue, setShortAnswerValue] = useState('');
  const [remainingNodesCount, setRemainingNodesCount] = useState<number | null>(null);
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [phaserInitialized, setPhaserInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMapId, setCurrentMapId] = useState<string | null>(null);
  const [currentQuizTitle, setCurrentQuizTitle] = useState<string>('Loading...');
  const [allNodeData, setAllNodeData] = useState<NodeWithQuiz[]>([]);

  // --- Refs ---
  const gameInstanceRef = useRef<Phaser.Game | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const sceneInstanceRef = useRef<MainSceneType | null>(null);
  const shortAnswerInputRef = useRef<HTMLInputElement>(null);
  const joystickManagerRef = useRef<nipplejs.JoystickManager | null>(null);
  const joystickZoneRef = useRef<HTMLDivElement>(null);

  // --- Data Fetching Effect ---
   useEffect(() => {
       const fetchQuizAndMapData = async () => {
           if (!quizId) {
                console.warn("[React] quizId not available for data fetching.");
                return;
           }
           console.log(`[React] Loading data for quizId: ${quizId}`);
           setIsLoading(true);

           try {
                // 1. Fetch quiz details to find out which map to use
                const quizResponse = await fetch(`/api/quizzes/${quizId}`);
                if (!quizResponse.ok) throw new Error('Quiz not found');
                const quizData = await quizResponse.json();
                
                const mapId = quizData.map.map_identifier;
                setCurrentMapId(mapId);
                setCurrentQuizTitle(quizData.title);

                // 2. Fetch all nodes and questions for that map
                const mapDetailsResponse = await fetch(`/api/maps/${mapId}/quizzes`);
                if (!mapDetailsResponse.ok) throw new Error(`Failed to fetch map details for ${mapId}`);
                const nodesFromApi: NodeWithQuiz[] = await mapDetailsResponse.json();
                
                setAllNodeData(nodesFromApi);
                setRemainingNodesCount(nodesFromApi.filter(n => n.questions.length > 0).length);

           } catch (error) {
                console.error("[React] Error fetching quiz data:", error);
                toast({ title: "Failed to load quiz data", description: "Please try again later.", variant: "destructive" });
           } finally {
                setIsLoading(false);
           }
       };

       fetchQuizAndMapData();
   }, [quizId, toast]);

  const handleNodeInteraction: NodeInteractionCallback = useCallback((nodeDbId) => {
    const nodeWithQuiz = allNodeData.find(n => n.node_id === nodeDbId);

    if (nodeWithQuiz && nodeWithQuiz.questions.length > 0) {
        const firstQuestion = nodeWithQuiz.questions[0];
        setCurrentQuizData({
            nodeDbId: nodeDbId,
            question: firstQuestion,
            nodeDescription: nodeWithQuiz.title || `Quiz Node ${nodeDbId}`
        });
        setShowQuiz(true);
        // ... (rest of the logic)
    } else {
        // ... (rest of the logic)
    }
  }, [allNodeData]);

  const handleNodesCountUpdate: NodesCountCallback = useCallback((count) => {
      setRemainingNodesCount(count);
  }, []);

  const removeNode = useCallback((nodeDbId: number) => {
    if (sceneInstanceRef.current?.removeNode) {
        sceneInstanceRef.current.removeNode(nodeDbId);
    }
  }, []);

  // --- Phaser Game Initialization ---
   useEffect(() => {
        if (!currentMapId || allNodeData.length === 0 || !gameContainerRef.current || phaserInitialized) {
          return;
        }

        let game: Phaser.Game | null = null;
        const initPhaser = async () => {
            setPhaserInitialized(true);
            const Phaser = await import('phaser');
            const { default: MainScene } = await import('@/game/scenes/MainScene');
            const mainSceneInstance = new MainScene();
            
            const phaserNodeSetupData: NodeData[] = allNodeData.map(n => ({
                nodeId: n.node_id,
                x: n.posX,
                y: n.posY
            }));

            const config: Phaser.Types.Core.GameConfig = {
              type: Phaser.AUTO,
              parent: gameContainerRef.current,
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
                        { mapId: currentMapId },
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
      }, [currentMapId, allNodeData, phaserInitialized, handleNodeInteraction, handleNodesCountUpdate]);


    // ... (rest of the component logic remains largely the same)

    const handleAnswerSubmit = (selectedAnswer: string) => { /* ... */ };
    const closeQuiz = () => { /* ... */ };

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
        {isUIVisible && (
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
         )}
        
        {/* Quiz Modal */}
        {showQuiz && currentQuizData && (
            <div className="absolute inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
                {/* ... Quiz card JSX ... */}
            </div>
        )}
      </main>
    </div>
  );
}
