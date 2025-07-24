
'use client';

import * as React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, ChevronLeft, BookCopy } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

// Schema for a single option
const optionSchema = z.object({
  text: z.string().min(1, 'Option text cannot be empty.'),
});

// Schema for the main question form
const questionFormSchema = z.object({
  node_id: z.coerce.number().min(1, 'You must select a node.'),
  question_text: z.string().min(5, 'Question text must be at least 5 characters long.'),
  options: z.array(optionSchema).min(2, 'Must have at least 2 options.').max(5, 'Cannot have more than 5 options.'),
  correct_answer: z.string().min(1, 'You must specify the correct answer.'),
});

type QuestionFormData = z.infer<typeof questionFormSchema>;

interface NodeInfo {
  node_id: number;
  title: string;
}

interface QuestionInfo {
    question_id: number;
    question_text: string;
}

export default function QuestionBankPage({ params }: { params: { mapId: string } }) {
  const { mapId } = params;
  const { toast } = useToast();
  const [nodes, setNodes] = React.useState<NodeInfo[]>([]);
  const [questions, setQuestions] = React.useState<QuestionInfo[]>([]);
  const [selectedNodeId, setSelectedNodeId] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState({ nodes: true, questions: false });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<QuestionFormData>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      node_id: undefined,
      question_text: '',
      options: [{ text: '' }, { text: '' }],
      correct_answer: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options',
  });
  
  const watchedNodeId = watch('node_id');

  // Fetch available nodes for the map
  React.useEffect(() => {
    const fetchNodes = async () => {
      setIsLoading(prev => ({ ...prev, nodes: true }));
      try {
        // We can reuse the quizzes endpoint as it returns nodes
        const response = await fetch(`/api/maps/${mapId}/quizzes`);
        if (!response.ok) throw new Error('Failed to fetch nodes');
        const data = await response.json();
        setNodes(data.map((n: any) => ({ node_id: n.node_id, title: n.title || `Node ${n.node_id}` })));
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Could not load nodes for this map.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(prev => ({ ...prev, nodes: false }));
      }
    };
    fetchNodes();
  }, [mapId, toast]);
  
  // Fetch questions when a node is selected
  React.useEffect(() => {
      if (!watchedNodeId) {
          setQuestions([]);
          return;
      };

      const fetchQuestions = async () => {
          setIsLoading(prev => ({...prev, questions: true}));
          try {
              const response = await fetch(`/api/maps/${mapId}/questions?nodeId=${watchedNodeId}`);
              if (!response.ok) throw new Error('Failed to fetch questions for this node');
              const data = await response.json();
              setQuestions(data);
          } catch(error) {
              toast({
                  title: 'Error',
                  description: 'Could not load questions for this node.',
                  variant: 'destructive',
              });
              setQuestions([]);
          } finally {
              setIsLoading(prev => ({...prev, questions: false}));
          }
      };
      fetchQuestions();

  }, [watchedNodeId, mapId, toast]);

  const handleAddQuestion = async (data: QuestionFormData) => {
    setIsSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/maps/${mapId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Question added successfully.',
        });
        setQuestions(prev => [...prev, result.question]);
        reset({
            ...data,
            question_text: '',
            options: [{ text: '' }, { text: '' }],
            correct_answer: ''
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add question.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Network Error',
        description: 'Could not connect to the server.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
        <h1 className="text-3xl font-bold mb-2">Question Bank</h1>
        <p className="text-muted-foreground mb-6">Add or manage questions for map: <span className="font-mono text-primary">{mapId}</span></p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Add New Question</CardTitle>
                <CardDescription>Select a node and fill out the form to add a new question.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(handleAddQuestion)} className="space-y-6">
                  {/* Node Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="node_id">Target Node <span className="text-destructive">*</span></Label>
                     <Controller
                        name="node_id"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()} disabled={isLoading.nodes}>
                            <SelectTrigger>
                                <SelectValue placeholder={isLoading.nodes ? "Loading nodes..." : "Select a node..."} />
                            </SelectTrigger>
                            <SelectContent>
                                {nodes.map(node => (
                                <SelectItem key={node.node_id} value={node.node_id.toString()}>
                                    {node.title} (ID: {node.node_id})
                                </SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                        )}
                        />
                    {errors.node_id && <p className="text-xs text-destructive">{errors.node_id.message}</p>}
                  </div>

                  {/* Question Text */}
                  <div className="space-y-2">
                    <Label htmlFor="question_text">Question <span className="text-destructive">*</span></Label>
                    <Textarea id="question_text" placeholder="e.g., What is the capital of France?" {...register('question_text')} />
                    {errors.question_text && <p className="text-xs text-destructive">{errors.question_text.message}</p>}
                  </div>

                  {/* Options */}
                  <div className="space-y-4">
                    <Label>Answer Options <span className="text-destructive">*</span></Label>
                     {errors.options?.root && <p className="text-xs text-destructive">{errors.options.root.message}</p>}
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <Input
                          placeholder={`Option ${index + 1}`}
                          {...register(`options.${index}.text`)}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 2}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                     {fields.length < 5 && (
                        <Button type="button" variant="outline" size="sm" onClick={() => append({ text: '' })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                        </Button>
                     )}
                  </div>
                  
                   {/* Correct Answer */}
                  <div className="space-y-2">
                    <Label htmlFor="correct_answer">Correct Answer <span className="text-destructive">*</span></Label>
                    <Input id="correct_answer" placeholder="Type the exact text of the correct option" {...register('correct_answer')} />
                    {errors.correct_answer && <p className="text-xs text-destructive">{errors.correct_answer.message}</p>}
                  </div>


                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <><PlusCircle className="mr-2 h-4 w-4" /> Add Question</>}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Existing Questions</CardTitle>
                <CardDescription>Questions in the currently selected node.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                   {isLoading.questions ? (
                       <div className="flex items-center justify-center p-4">
                           <Loader2 className="animate-spin"/>
                       </div>
                   ) : !watchedNodeId ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Please select a node to see its questions.</p>
                   ) : questions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No questions added to this node yet.</p>
                  ) : (
                    <ul className="space-y-2 max-h-96 overflow-y-auto">
                      {questions.map(q => (
                        <li key={q.question_id} className="flex items-start justify-between p-3 bg-muted rounded-md text-sm">
                          <p className="flex-grow pr-2">{q.question_text}</p>
                          <Button variant="ghost" size="icon" className="flex-shrink-0">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

    