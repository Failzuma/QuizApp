
'use client';

import * as React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Link, Unlink, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// Data types matching the new architecture
interface QuizDetails {
  title: string;
  map_identifier: string;
  questions: LinkedQuestion[]; // Questions already linked to this quiz
}

interface MapNode {
  node_id: number;
  title: string | null;
  posX: number;
  posY: number;
}

interface QuestionFromBank {
  question_id: number;
  question_text: string;
}

interface LinkedQuestion {
    node_id: number;
    question_id: number;
    question: {
        question_text: string;
    }
}

export default function EditQuizPage({ params }: { params: { quizId: string } }) {
  const { quizId } = params;
  const { toast } = useToast();
  const [quizDetails, setQuizDetails] = React.useState<QuizDetails | null>(null);
  const [mapNodes, setMapNodes] = React.useState<MapNode[]>([]);
  const [questionBank, setQuestionBank] = React.useState<QuestionFromBank[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  // State for the linking UI
  const [selectedNodeId, setSelectedNodeId] = React.useState<number | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = React.useState<number | null>(null);
  const [isLinking, setIsLinking] = React.useState(false);

  const backgroundUrl = quizDetails ? `/assets/images/backgrounds/${quizDetails.map_identifier}_background.png` : '';

  // Fetch all necessary data on component mount
  React.useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        // 1. Fetch Quiz Details (which includes currently linked questions)
        const quizRes = await fetch(`/api/quizzes/${quizId}`, { headers });
        if (!quizRes.ok) throw new Error('Failed to fetch quiz details.');
        const quizData: QuizDetails = await quizRes.json();
        setQuizDetails(quizData);

        // 2. Fetch all nodes for the map associated with the quiz
        const nodesRes = await fetch(`/api/maps/${quizData.map_identifier}/nodes`, { headers });
        if (!nodesRes.ok) throw new Error('Failed to fetch map nodes.');
        const nodesData: MapNode[] = await nodesRes.json();
        setMapNodes(nodesData);

        // 3. Fetch all questions from the global question bank
        const bankRes = await fetch('/api/questions', { headers });
        if (!bankRes.ok) throw new Error('Failed to fetch question bank.');
        const bankData: QuestionFromBank[] = await bankRes.json();
        setQuestionBank(bankData);

      } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, [quizId, toast]);

  const handleLinkQuestion = async () => {
    if (!selectedNodeId || !selectedQuestionId) {
        toast({ title: 'Selection Missing', description: 'Please select both a node and a question.', variant: 'destructive' });
        return;
    }
    setIsLinking(true);
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/quizzes/${quizId}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                node_id: selectedNodeId,
                question_id: selectedQuestionId
            })
        });

        const result = await response.json();
        if (response.ok) {
            toast({ title: 'Success', description: 'Question linked to node successfully.' });
            // Add the new link to the local state to update the UI
            const newLink = { 
                node_id: selectedNodeId,
                question_id: selectedQuestionId,
                question: { question_text: questionBank.find(q => q.question_id === selectedQuestionId)?.question_text || '' }
            };
            setQuizDetails(prev => prev ? { ...prev, questions: [...prev.questions, newLink] } : null);
            setSelectedNodeId(null);
            setSelectedQuestionId(null);
        } else {
             toast({ title: 'Linking Failed', description: result.error, variant: 'destructive' });
        }
    } catch (error) {
        toast({ title: 'Network Error', description: 'Could not connect to the server.', variant: 'destructive' });
    } finally {
        setIsLinking(false);
    }
  };
  
  const getLinkedQuestionText = (nodeId: number): string | null => {
      const link = quizDetails?.questions.find(q => q.node_id === nodeId);
      return link ? link.question.question_text : null;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Loading Quiz Editor...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Quiz Editor</h1>
        <p className="text-muted-foreground mb-6">Editing quiz: <span className="font-mono text-primary">{quizDetails?.title}</span></p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Map Preview */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Map Preview & Node Selection</CardTitle>
                <CardDescription>Click on a node to select it for question linking.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative w-full aspect-video bg-muted border rounded-md overflow-hidden">
                  <img src={backgroundUrl} alt={`Background for ${quizDetails?.map_identifier}`} className="w-full h-full object-cover" onError={(e) => e.currentTarget.src = 'https://placehold.co/1280x720.png'} />
                  {mapNodes.map((node) => {
                    const linkedQuestionText = getLinkedQuestionText(node.node_id);
                    return (
                        <div
                            key={node.node_id}
                            className={`absolute transform -translate-x-1/2 -translate-y-1/2 p-2 rounded-full cursor-pointer transition-all duration-200
                                ${selectedNodeId === node.node_id ? 'bg-yellow-400 scale-125 shadow-lg' : 'bg-blue-500'}
                                ${linkedQuestionText ? 'bg-green-500' : 'bg-blue-500'}
                            `}
                            style={{ left: `${(node.posX / 1280) * 100}%`, top: `${(node.posY / 720) * 100}%` }}
                            onClick={() => setSelectedNodeId(node.node_id)}
                            title={linkedQuestionText ? `Linked: ${linkedQuestionText}` : `Node ${node.node_id}`}
                        >
                            <span className="text-white font-bold text-xs">{node.node_id}</span>
                            {linkedQuestionText && <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-white bg-green-700 rounded-full"/>}
                        </div>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Note: Preview assumes a 1280x720 map aspect ratio for positioning.</p>
              </CardContent>
            </Card>
          </div>

          {/* Linking Controls */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Link Question to Node</CardTitle>
                <CardDescription>Select a node on the map, choose a question from the bank, and link them.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Selected Node</Label>
                    <div className="w-full p-3 border rounded-md bg-muted text-sm">
                        {selectedNodeId ? `Node ID: ${selectedNodeId}` : 'None selected (click a node on the map)'}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="question-select">Question from Bank</Label>
                    <Select onValueChange={(val) => setSelectedQuestionId(Number(val))} value={selectedQuestionId?.toString()}>
                        <SelectTrigger id="question-select">
                            <SelectValue placeholder="Select a question..." />
                        </SelectTrigger>
                        <SelectContent>
                            {questionBank.map(q => (
                                <SelectItem key={q.question_id} value={q.question_id.toString()} disabled={quizDetails?.questions.some(linked => linked.question_id === q.question_id)}>
                                    <span className="truncate" title={q.question_text}>{q.question_text}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     <p className="text-xs text-muted-foreground">Disabled questions are already used in this quiz.</p>
                </div>
                
                <Button 
                    className="w-full" 
                    onClick={handleLinkQuestion} 
                    disabled={!selectedNodeId || !selectedQuestionId || isLinking || !!getLinkedQuestionText(selectedNodeId)}
                >
                    {isLinking ? <Loader2 className="animate-spin" /> : <Link className="mr-2 h-4 w-4" />}
                    {getLinkedQuestionText(selectedNodeId) ? 'Node Already Linked' : 'Link Question'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
