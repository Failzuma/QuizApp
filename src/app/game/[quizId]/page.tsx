
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckSquare, ZoomIn, ZoomOut } from 'lucide-react';
import type MainSceneType from '@/game/scenes/MainScene';
import type { NodeInteractionCallback, NodesCountCallback, SceneInitData } from '@/game/scenes/MainScene';
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useRouter } from 'next/navigation';
import nipplejs from 'nipplejs';
import { useMobile } from '@/hooks/use-mobile';

// --- TYPE DEFINITIONS ---

interface QuizNodeData {
    node_id: number;
    question_id: number;
    question_text: string;
    options: { option_id: number; option_text: string }[];
}

interface GameData {
    quiz_id: number;
    title: string;
    description: string | null;
    map: {
        map_identifier: string;
        title: string;
    };
    questions: QuizNodeData[];
}

interface UserData {
    username: string;
    character: string;
}


// --- MAIN COMPONENT ---

export default function GamePage({ params }: { params: { quizId: string } }) {
  const { quizId } = params;
  const { toast } = useToast();
  const router = useRouter();
  const isMobile = useMobile();

  // --- State Management ---
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuizNode, setCurrentQuizNode] = useState<QuizNodeData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remainingNodesCount, setRemainingNodesCount] = useState<number | null>(null);
  
  // Refs for Phaser and Joystick instances
  const gameInstanceRef = useRef<Phaser.Game | null>(null);
  const sceneInstanceRef = useRef<MainSceneType | null>(null);
  const joystickManagerRef = useRef<nipplejs.JoystickManager | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const joystickContainerRef = useRef<HTMLDivElement>(null);

  // --- Data Fetching and User Validation Effect ---
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      if (!token || !userData) {
        toast({ title: "Akses Ditolak", description: "Anda harus login untuk bermain.", variant: "destructive" });
        router.push('/login');
        return;
      }
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        toast({ title: "Error", description: "Data user tidak valid.", variant: "destructive" });
        router.push('/login');
        return;
      }

      try {
        const response = await fetch(`/api/quizzes/${quizId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Quiz tidak ditemukan');
        }
        const data: GameData = await response.json();
        setGameData(data);
        setRemainingNodesCount(data.questions.length);
      } catch (error: any) {
        console.error("[React] Error fetching game data:", error);
        toast({ title: "Gagal memuat kuis", description: error.message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, [quizId, toast, router]);

  // --- Phaser Interaction Callbacks ---
  const handleNodeInteraction = useCallback((nodeDbId: number) => {
    const quizNode = gameData?.questions.find(n => n.node_id === nodeDbId);
    if (quizNode) {
      setCurrentQuizNode(quizNode);
      setSelectedAnswer(null);
      sceneInstanceRef.current?.disablePlayerInput();
    }
  }, [gameData]);

  const handleNodesCountUpdate = useCallback((count: number) => {
    setRemainingNodesCount(count);
  }, []);

  // --- Phaser Game Initialization and Cleanup Effect ---
  useEffect(() => {
    if (isLoading || !gameData || !user || !gameContainerRef.current || gameInstanceRef.current) {
      return; // Exit if still loading, data is missing, or game is already initialized
    }
    
    let game: Phaser.Game;

    const initPhaser = async () => {
      const Phaser = await import('phaser');
      const { default: MainScene } = await import('@/game/scenes/MainScene');
      
      const sceneInitData: SceneInitData = {
        gameData,
        playerCharacterUrl: user.character,
        interactCallback: handleNodeInteraction,
        countCallback: handleNodesCountUpdate,
      };

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: gameContainerRef.current!,
        width: '100%',
        height: '100%',
        physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
        render: { pixelArt: true, antialias: false },
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: MainScene,
      };
      
      game = new Phaser.Game(config);
      game.scene.start('MainScene', sceneInitData); // Pass data on start
      sceneInstanceRef.current = game.scene.getScene('MainScene') as MainSceneType;
      gameInstanceRef.current = game;
    };

    initPhaser();

    return () => {
      sceneInstanceRef.current = null;
      gameInstanceRef.current?.destroy(true);
      gameInstanceRef.current = null;
    };
  }, [isLoading, gameData, user, handleNodeInteraction, handleNodesCountUpdate]);

  // --- Joystick Initialization Effect ---
  useEffect(() => {
    if (isMobile && gameInstanceRef.current && joystickContainerRef.current && !joystickManagerRef.current) {
        const manager = nipplejs.create({
            zone: joystickContainerRef.current,
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: 'white',
            size: 150,
        });
        
        manager.on('move', (_, data) => sceneInstanceRef.current?.joystickInput(data));
        manager.on('end', () => sceneInstanceRef.current?.joystickInput({ direction: undefined, angle: { radian: 0 } }));

        joystickManagerRef.current = manager;
    }
    return () => {
        joystickManagerRef.current?.destroy();
        joystickManagerRef.current = null;
    };
  }, [isMobile, gameData]); // Reruns if gameData changes, ensuring joystick is ready

  // --- UI Event Handlers ---
  const handleAnswerSubmit = async () => {
    if (!selectedAnswer || !currentQuizNode) return;
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500)); 
    toast({ title: "Jawaban Terkirim!", description: "Jawabanmu telah direkam." });
    
    sceneInstanceRef.current?.removeNode(currentQuizNode.node_id);
    closeQuiz(false);
    setIsSubmitting(false);
  };

  const closeQuiz = (reEnableNode = true) => {
    if (reEnableNode && currentQuizNode) {
      sceneInstanceRef.current?.reEnableNode(currentQuizNode.node_id);
    }
    setCurrentQuizNode(null);
    sceneInstanceRef.current?.enablePlayerInput();
  };

  // --- Render Logic ---
  if (isLoading || !gameData) {
    return (
      <div className="flex flex-col h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">{isLoading ? 'Memuat Kuis...' : 'Gagal memuat data.'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <main className="flex-grow relative">
        <div ref={gameContainerRef} id="phaser-game-container" className="absolute inset-0 bg-muted" />
        
        {/* --- In-Game UI --- */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-4 w-full max-w-xs sm:max-w-sm">
          <Card className="bg-background/80 backdrop-blur-sm">
            <CardHeader className="p-3">
              <CardTitle className="text-lg truncate">{gameData.title}</CardTitle>
              <CardDescription>Peta: {gameData.map.title}</CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-background/80 backdrop-blur-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Node Tersisa:</span>
              </div>
              <span className="font-bold text-lg text-primary">{remainingNodesCount ?? '--'}</span>
            </CardContent>
          </Card>
        </div>

        {isMobile && (
          <>
            <div ref={joystickContainerRef} className="absolute bottom-1/4 left-0 w-1/3 h-1/2" />
            <div className="absolute bottom-8 right-4 flex flex-col gap-4 z-10">
              <Button size="icon" className="rounded-full h-14 w-14" onClick={() => sceneInstanceRef.current?.zoomIn()}><ZoomIn /></Button>
              <Button size="icon" className="rounded-full h-14 w-14" onClick={() => sceneInstanceRef.current?.zoomOut()}><ZoomOut /></Button>
            </div>
          </>
        )}
        
        {/* --- Quiz Modal --- */}
        {currentQuizNode && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl">
              <CardHeader>
                <CardTitle>Pertanyaan</CardTitle>
                <CardDescription>{currentQuizNode.question_text}</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={selectedAnswer ?? undefined} onValueChange={setSelectedAnswer} className="space-y-2">
                  {currentQuizNode.options.map(opt => (
                    <div key={opt.option_id} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt.option_text} id={`opt-${opt.option_id}`} />
                      <Label htmlFor={`opt-${opt.option_id}`}>{opt.option_text}</Label>
                    </div>
                  ))}
                </RadioGroup>
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => closeQuiz(true)} disabled={isSubmitting}>Batal</Button>
                  <Button onClick={handleAnswerSubmit} disabled={!selectedAnswer || isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Kirim Jawaban'}
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
