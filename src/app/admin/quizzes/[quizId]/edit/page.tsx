
'use client';

import * as React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Link, Unlink, CheckCircle, Trash2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Data types
interface QuizDetails {
  title: string;
  map_identifier: string;
  questions: LinkedQuestion[];
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
  
  const [selectedNodeId, setSelectedNodeId] = React.useState<number | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = React.useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [imageDimensions, setImageDimensions] = React.useState({ width: 1280, height: 720 });


  const backgroundUrl = quizDetails ? `/assets/images/backgrounds/${quizDetails.map_identifier}_background.png` : '';

  // Fetch all necessary data on component mount
  React.useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        const [quizRes, bankRes] = await Promise.all([
             fetch(`/api/quizzes/${quizId}`, { headers }),
             fetch('/api/questions', { headers })
        ]);

        if (!quizRes.ok) throw new Error('Failed to fetch quiz details.');
        const quizData: QuizDetails = await quizRes.json();
        setQuizDetails(quizData);

        if (!bankRes.ok) throw new Error('Failed to fetch question bank.');
        const bankData: QuestionFromBank[] = await bankRes.json();
        setQuestionBank(bankData);

        const nodesRes = await fetch(`/api/maps/${quizData.map_identifier}/nodes`, { headers });
        if (!nodesRes.ok) throw new Error('Failed to fetch map nodes.');
        const nodesData: MapNode[] = await nodesRes.json();
        setMapNodes(nodesData);

      } catch (error: any) {
        toast({ title: 'Error Loading Editor', description: error.message, variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, [quizId, toast]);

  const handleLinkQuestion = async () => {
    if (!selectedNodeId || !selectedQuestionId) return;
    
    setIsSubmitting(true);
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/quizzes/${quizId}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ node_id: selectedNodeId, question_id: Number(selectedQuestionId) })
        });
        const result = await response.json();

        if (response.ok) {
            toast({ title: 'Success', description: 'Question linked successfully.' });
            const newLink = { 
                node_id: selectedNodeId,
                question_id: Number(selectedQuestionId),
                question: { question_text: questionBank.find(q => q.question_id === Number(selectedQuestionId))?.question_text || '' }
            };
            setQuizDetails(prev => prev ? { ...prev, questions: [...prev.questions, newLink] } : null);
            setSelectedQuestionId(undefined); // Reset select
        } else {
             toast({ title: 'Linking Failed', description: result.error, variant: 'destructive' });
        }
    } catch (error: any) {
        toast({ title: 'Network Error', description: error.message, variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleUnlinkQuestion = async () => {
      if (!selectedNodeId) return;

      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      try {
           const response = await fetch(`/api/quizzes/${quizId}/questions`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ node_id: selectedNodeId })
            });
            const result = await response.json();
            if (response.ok) {
                toast({ title: 'Success', description: 'Question has been unlinked.' });
                setQuizDetails(prev => prev ? { ...prev, questions: prev.questions.filter(q => q.node_id !== selectedNodeId)} : null);
            } else {
                 toast({ title: 'Unlinking Failed', description: result.error, variant: 'destructive' });
            }
      } catch (error: any) {
          toast({ title: 'Network Error', description: error.message, variant: 'destructive' });
      } finally {
          setIsSubmitting(false);
      }
  }
  
  const linkedQuestionForSelectedNode = React.useMemo(() => {
      if (!selectedNodeId || !quizDetails) return null;
      return quizDetails.questions.find(q => q.node_id === selectedNodeId) || null;
  }, [selectedNodeId, quizDetails]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Quiz Editor: <span className="text-primary">{quizDetails?.title}</span></h1>
        <p className="text-muted-foreground mb-6">Map: <span className="font-mono">{quizDetails?.map_identifier}</span></p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Map Preview & Node Selection</CardTitle>
                <CardDescription>Click a node to manage its linked question.</CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                    className="relative w-full bg-muted border rounded-md overflow-hidden"
                    style={{ aspectRatio: `${imageDimensions.width} / ${imageDimensions.height}`}}
                >
                  <img 
                    src={backgroundUrl} 
                    alt="Map Background" 
                    className="w-full h-full object-cover" 
                    onLoad={(e) => {
                        const img = e.currentTarget;
                        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                    }}
                    onError={(e) => e.currentTarget.style.display='none'} 
                  />
                  {mapNodes.map((node) => {
                    const isLinked = quizDetails?.questions.some(q => q.node_id === node.node_id);
                    return (
                        <div
                            key={node.node_id}
                            className={`absolute flex items-center justify-center w-6 h-6 rounded-full cursor-pointer transition-all duration-200 transform -translate-x-1/2 -translate-y-1/2
                                ${selectedNodeId === node.node_id ? 'ring-4 ring-yellow-400' : ''}
                                ${isLinked ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'}
                            `}
                            style={{ 
                                left: `${(node.posX / imageDimensions.width) * 100}%`, 
                                top: `${(node.posY / imageDimensions.height) * 100}%` 
                            }}
                            onClick={() => setSelectedNodeId(node.node_id)}
                            title={`Node ${node.node_id}`}
                        >
                            <span className="text-white font-bold text-xs">{node.node_id}</span>
                            {isLinked && <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-white bg-green-700 rounded-full"/>}
                        </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Manage Node Question</CardTitle>
                <CardDescription>
                    {selectedNodeId ? `Managing Node ID: ${selectedNodeId}` : "Select a node from the map."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!selectedNodeId ? (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>No Node Selected</AlertTitle>
                        <AlertDescription>Click a node on the map to start.</AlertDescription>
                    </Alert>
                ) : linkedQuestionForSelectedNode ? (
                    <div className="space-y-4">
                        <Label>Linked Question</Label>
                        <div className="p-3 border rounded-md bg-muted text-sm">
                           {linkedQuestionForSelectedNode.question.question_text}
                        </div>
                        <Button className="w-full" variant="destructive" onClick={handleUnlinkQuestion} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <Unlink className="mr-2 h-4 w-4" />}
                             Unlink Question
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="question-select">Available Questions</Label>
                            <Select onValueChange={setSelectedQuestionId} value={selectedQuestionId}>
                                <SelectTrigger id="question-select">
                                    <SelectValue placeholder="Select a question to link..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {questionBank.map(q => (
                                        <SelectItem key={q.question_id} value={q.question_id.toString()} disabled={quizDetails?.questions.some(linked => linked.question_id === q.question_id)}>
                                            {q.question_text}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button className="w-full" onClick={handleLinkQuestion} disabled={!selectedQuestionId || isSubmitting}>
                             {isSubmitting ? <Loader2 className="animate-spin" /> : <Link className="mr-2 h-4 w-4" />}
                             Link This Question
                        </Button>
                    </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
