
'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChevronLeft, Replace } from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface MapNode {
  node_id: number;
  title: string;
}

interface Question {
  question_id: number;
  question_text: string;
}

interface AssignedQuestion {
  node_id: number;
  node_title: string;
  question_id: number;
  question_text: string;
}

const assignQuestionSchema = z.object({
  question_id: z.coerce.number().min(1, 'You must select a question.'),
});

type AssignQuestionForm = z.infer<typeof assignQuestionSchema>;

export default function AssignQuestionsPage({ params }: { params: { quizId: string } }) {
  const { quizId } = params;
  const { toast } = useToast();
  
  const [quizDetails, setQuizDetails] = React.useState<{title: string, mapId: string} | null>(null);
  const [mapNodes, setMapNodes] = React.useState<MapNode[]>([]);
  const [questionBank, setQuestionBank] = React.useState<Question[]>([]);
  const [assignedQuestions, setAssignedQuestions] = React.useState<AssignedQuestion[]>([]);
  
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedNode, setSelectedNode] = React.useState<MapNode | null>(null);

  const { control, handleSubmit, reset } = useForm<AssignQuestionForm>({
      resolver: zodResolver(assignQuestionSchema),
  });

  React.useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      try {
        // Fetch Quiz Details (to get mapId)
        const quizRes = await fetch(`/api/quizzes/${quizId}`, { headers });
        if (!quizRes.ok) throw new Error('Failed to fetch quiz details.');
        const quizData = await quizRes.json();
        setQuizDetails({ title: quizData.title, mapId: quizData.map.map_identifier });

        // Fetch Nodes for the Map
        const nodesRes = await fetch(`/api/maps/${quizData.map.map_identifier}/nodes`, { headers });
        if (!nodesRes.ok) throw new Error('Failed to fetch map nodes.');
        const nodesData = await nodesRes.json();
        setMapNodes(nodesData);
        
        // Fetch Question Bank
        const questionBankRes = await fetch('/api/questions', { headers });
        if (!questionBankRes.ok) throw new Error('Failed to fetch question bank.');
        const questionBankData = await questionBankRes.json();
        setQuestionBank(questionBankData);

        // Fetch Already Assigned Questions for this Quiz
        const assignedRes = await fetch(`/api/quizzes/${quizId}/questions`, { headers });
        if (!assignedRes.ok) throw new Error('Failed to fetch assigned questions.');
        const assignedData = await assignedRes.json();
        setAssignedQuestions(assignedData);

      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Could not load data for this page.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [quizId, toast]);

  const handleOpenModal = (node: MapNode) => {
    setSelectedNode(node);
    reset(); // Clear previous form state
    setIsModalOpen(true);
  };
  
  const getAssignedQuestionForNode = (nodeId: number): AssignedQuestion | undefined => {
      return assignedQuestions.find(aq => aq.node_id === nodeId);
  };

  const onAssignSubmit = async (data: AssignQuestionForm) => {
      if (!selectedNode) return;
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      try {
          const response = await fetch(`/api/quizzes/${quizId}/questions`, {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                  nodeId: selectedNode.node_id,
                  questionId: data.question_id
              }),
          });
          const result = await response.json();
          if (!response.ok) {
              throw new Error(result.error || 'Failed to assign question');
          }

          toast({
              title: 'Success!',
              description: `Question has been assigned to ${selectedNode.title}.`
          });
          
          // Update local state to reflect the change immediately
          const newAssignment = {
              node_id: selectedNode.node_id,
              node_title: selectedNode.title,
              question_id: result.quizQuestion.question_id,
              question_text: questionBank.find(q => q.question_id === result.quizQuestion.question_id)?.question_text || 'Unknown Question'
          }
          setAssignedQuestions(prev => {
              // Remove old assignment for this node if it exists, then add the new one
              const filtered = prev.filter(aq => aq.node_id !== selectedNode.node_id);
              return [...filtered, newAssignment];
          });
          
          setIsModalOpen(false);

      } catch (error: any) {
          toast({
              title: 'Error',
              description: error.message,
              variant: 'destructive'
          });
      } finally {
        setIsSubmitting(false);
      }
  };

  return (
    <>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="mb-6">
              <Button asChild variant="outline">
                  <Link href="/admin">
                      <ChevronLeft className="mr-2 h-4 w-4"/> Back to Admin Panel
                  </Link>
              </Button>
          </div>

          {isLoading ? (
            <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto"/>
                <p className="mt-2 text-muted-foreground">Loading assignment data...</p>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold mb-2">Assign Questions</h1>
              <p className="text-muted-foreground mb-1">Quiz: <span className="font-semibold text-primary">{quizDetails?.title}</span></p>
              <p className="text-muted-foreground mb-6">Map Blueprint: <span className="font-mono">{quizDetails?.mapId}</span></p>
              
              <Card>
                <CardHeader>
                    <CardTitle>Map Nodes</CardTitle>
                    <CardDescription>Assign a question from the bank to each node on the map. Each node in a quiz must have one question.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {mapNodes.length > 0 ? (
                            mapNodes.map(node => {
                                const assignedQuestion = getAssignedQuestionForNode(node.node_id);
                                return (
                                    <div key={node.node_id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                                        <div>
                                            <h3 className="font-semibold">{node.title} (ID: {node.node_id})</h3>
                                            {assignedQuestion ? (
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    <span className="font-medium text-primary">Assigned:</span> {assignedQuestion.question_text}
                                                </p>
                                            ) : (
                                                <Badge variant="destructive" className="mt-2">No Question Assigned</Badge>
                                            )}
                                        </div>
                                        <Button onClick={() => handleOpenModal(node)}>
                                            <Replace className="mr-2 h-4 w-4" /> 
                                            {assignedQuestion ? 'Change' : 'Assign'} Question
                                        </Button>
                                    </div>
                                )
                            })
                        ) : (
                             <p className="text-sm text-muted-foreground text-center py-4">This map blueprint has no nodes defined.</p>
                        )}
                    </div>
                </CardContent>
              </Card>
            </>
          )}

        </main>
        <Footer />
      </div>

      {/* --- Assign Question Modal --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Assign Question to "{selectedNode?.title}"</DialogTitle>
                <DialogDescription>
                    Select a question from the bank to link to this node for this specific quiz.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onAssignSubmit)}>
                <div className="py-4">
                     <Controller
                        name="question_id"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value?.toString()}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a question from the bank..."/>
                            </SelectTrigger>
                            <SelectContent>
                                <ScrollArea className="h-72">
                                    {questionBank.map(q => (
                                    <SelectItem key={q.question_id} value={q.question_id.toString()}>
                                        {q.question_text}
                                    </SelectItem>
                                    ))}
                                </ScrollArea>
                            </SelectContent>
                            </Select>
                        )}
                        />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                    <Button type="button" variant="outline">
                        Cancel
                    </Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Assign Question
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

    