
'use client';

import * as React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, PlusCircle, Edit, Trash2, Map, MapPin, HelpCircle, Users, Loader2, BookOpen, FileQuestion } from 'lucide-react';
import { AddQuizModal, QuizFormData } from '@/components/admin/AddQuizModal';
import { AddMapModal, MapBlueprintFormData } from '@/components/admin/AddMapModal';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { AddQuestionModal } from '@/components/admin/AddQuestionModal';
import type { QuestionFormData } from '@/components/admin/AddQuestionModal';

interface AdminMap {
  id: string;
  title: string;
  nodes: number;
}

interface AdminQuiz {
    id: number;
    title: string;
    mapId: string;
}

interface AdminQuestion {
    id: number;
    text: string;
}

interface SessionResult {
    id: string;
    mapTitle: string;
    date: string;
    participants: number;
    avgScore: number;
}

export default function AdminPage() {
  const [isAddQuizModalOpen, setIsAddQuizModalOpen] = React.useState(false);
  const [isAddMapModalOpen, setIsAddMapModalOpen] = React.useState(false);
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = React.useState(false);

  const [quizzes, setQuizzes] = React.useState<AdminQuiz[]>([]);
  const [maps, setMaps] = React.useState<AdminMap[]>([]);
  const [questions, setQuestions] = React.useState<AdminQuestion[]>([]);
  const [sessionResults, setSessionResults] = React.useState<SessionResult[]>([]);
  const [isLoading, setIsLoading] = React.useState({ maps: true, quizzes: true, questions: true, results: true });
  const { toast } = useToast();
  const router = useRouter();

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    const fetchData = async () => {
      try {
        setIsLoading(prev => ({ ...prev, maps: true, quizzes: true, questions: true, results: true }));
        
        const headers = { 'Authorization': `Bearer ${token}` };

        // Fetch Maps (Blueprints)
        const mapsResponse = await fetch('/api/maps/admin-summary', { headers });
        const mapsData = await mapsResponse.json();
        if(mapsResponse.ok) setMaps(mapsData);
        else throw new Error(mapsData.error || 'Failed to fetch maps');

        // Fetch Quizzes (Playable Instances)
        const quizzesResponse = await fetch('/api/quizzes', { headers });
        const quizzesData = await quizzesResponse.json();
        if(quizzesResponse.ok) {
            const formattedQuizzes = quizzesData.map((q: any) => ({ id: q.id, title: q.title, mapId: q.mapId }));
            setQuizzes(formattedQuizzes);
        } else {
            throw new Error(quizzesData.error || 'Failed to fetch quizzes');
        }


        // Fetch Questions (Question Bank)
        const questionsResponse = await fetch('/api/questions', { headers });
        const questionsData = await questionsResponse.json();
        if (questionsResponse.ok) {
            const formattedQuestions = questionsData.map((q: any) => ({ id: q.question_id, text: q.question_text }));
            setQuestions(formattedQuestions);
        } else {
             throw new Error(questionsData.error || 'Failed to fetch questions');
        }
        
      } catch (error: any) {
        console.error("Failed to fetch admin data", error);
        toast({ title: "Error", description: error.message || "Could not load admin data.", variant: "destructive" });
      } finally {
        setIsLoading(prev => ({ ...prev, maps: false, quizzes: false, questions: false, results: false }));
      }
    };
    if (token) {
        fetchData();
    } else {
        router.push('/login');
    }
  }, [toast, router]);


  const handleExportResults = () => {
      console.log("Exporting session results...");
      toast({
          title: "Info",
          description: "Fungsionalitas ekspor belum diimplementasikan."
      })
  };
  
  const handleAddMap = async (data: MapBlueprintFormData) => {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/maps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
            toast({ title: "Success!", description: `Map '${result.map.title}' blueprint has been created.` });
            const newMap: AdminMap = { id: result.map.map_identifier, title: result.map.title, nodes: data.nodes.length };
            setMaps(prevMaps => [...prevMaps, newMap]);
            setIsAddMapModalOpen(false);
        } else {
             toast({ title: "Failed to Create Map", description: result.error || "An unknown error occurred.", variant: "destructive" });
        }
    } catch (error) {
         toast({ title: "Network Error", description: "Could not connect to the server.", variant: "destructive" });
    }
  };

  const handleAddQuiz = async (data: QuizFormData) => {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/quizzes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
            toast({ title: "Success!", description: `Quiz '${result.quiz.title}' has been created.` });
            const newQuiz: AdminQuiz = { id: result.quiz.quiz_id, title: result.quiz.title, mapId: result.quiz.map_identifier };
            setQuizzes(prevQuizzes => [...prevQuizzes, newQuiz]);
            setIsAddQuizModalOpen(false);
        } else {
            toast({ title: "Failed to Create Quiz", description: result.error || "An unknown error occurred.", variant: "destructive" });
        }
    } catch (error) {
        toast({ title: "Network Error", description: "Could not connect to the server.", variant: "destructive" });
    }
  };

  const handleAddQuestion = async (data: QuestionFormData) => {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
            toast({ title: "Success!", description: `Question has been added to the bank.` });
            const newQuestion: AdminQuestion = { id: result.question.question_id, text: result.question.question_text };
            setQuestions(prevQuestions => [...prevQuestions, newQuestion]);
            setIsAddQuestionModalOpen(false);
        } else {
            toast({ title: "Failed to Create Question", description: result.error || "An unknown error occurred.", variant: "destructive" });
        }
    } catch (error) {
        toast({ title: "Network Error", description: "Could not connect to the server.", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-primary">Admin Panel</h1>

        <Tabs defaultValue="quizzes">
          <TabsList className="mb-6 grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
            <TabsTrigger value="quizzes"><BookOpen className="mr-2" /> Playable Quizzes</TabsTrigger>
            <TabsTrigger value="maps"><Map className="mr-2" /> Map Blueprints</TabsTrigger>
            <TabsTrigger value="questions"><HelpCircle className="mr-2" /> Question Bank</TabsTrigger>
            <TabsTrigger value="results"><Users className="mr-2" /> Session Results</TabsTrigger>
          </TabsList>

          <TabsContent value="maps">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                   <CardTitle>Manage Map Blueprints</CardTitle>
                   <Button size="sm" onClick={() => setIsAddMapModalOpen(true)}>
                       <PlusCircle className="mr-2" /> Add New Map Blueprint
                    </Button>
                </div>
                <CardDescription>Create or edit reusable map templates for your quizzes.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Map Title</TableHead>
                      <TableHead>Map Identifier</TableHead>
                      <TableHead>Nodes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading.maps ? (
                        <TableRow><TableCell colSpan={4} className="text-center h-24"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                    ) : maps.length > 0 ? (
                        maps.map((map) => (
                          <TableRow key={map.id}>
                            <TableCell className="font-medium">{map.title}</TableCell>
                            <TableCell className="font-mono">{map.id}</TableCell>
                            <TableCell>{map.nodes}</TableCell>
                            <TableCell className="text-right space-x-2">
                               <Button variant="ghost" size="icon" title="Edit Obstacles" onClick={() => router.push(`/admin/maps/${map.id}/editor`)}>
                                   <MapPin />
                               </Button>
                              <Button variant="ghost" size="icon" title="Edit Map Info" disabled>
                                <Edit />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Delete Map" disabled>
                                <Trash2 />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center h-24">
                                No map blueprints created yet.
                            </TableCell>
                        </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quizzes">
            <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                   <CardTitle>Manage Playable Quizzes</CardTitle>
                   <Button size="sm" onClick={() => setIsAddQuizModalOpen(true)} disabled={maps.length === 0}>
                       <PlusCircle className="mr-2" /> Add New Quiz
                    </Button>
                </div>
                <CardDescription>Create quiz instances from map blueprints and assign questions to their nodes.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                      <TableHead>Quiz Title</TableHead>
                      <TableHead>Underlying Map</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {isLoading.quizzes ? (
                        <TableRow><TableCell colSpan={3} className="text-center h-24"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                    ) : quizzes.length > 0 ? (
                        quizzes.map((quiz) => (
                        <TableRow key={quiz.id}>
                            <TableCell className="font-medium max-w-sm truncate">{quiz.title}</TableCell>
                            <TableCell className="font-mono">{quiz.mapId}</TableCell>
                            <TableCell className="text-right space-x-2">
                             <Button variant="ghost" size="icon" title="Assign Questions" onClick={() => router.push(`/admin/quizzes/${quiz.id}/questions`)}>
                                   <FileQuestion />
                               </Button>
                            <Button variant="ghost" size="icon" title="Edit Quiz" disabled>
                                <Edit />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Delete Quiz" disabled>
                                <Trash2 />
                            </Button>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                       <TableRow>
                            <TableCell colSpan={3} className="text-center h-24">
                                No quizzes created. Use "Add New Quiz" to start.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                </Table>
            </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questions">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Global Question Bank</CardTitle>
                        <Button size="sm" onClick={() => setIsAddQuestionModalOpen(true)}>
                           <PlusCircle className="mr-2" /> Add New Question
                        </Button>
                    </div>
                    <CardDescription>A central repository of all questions that can be assigned to quiz nodes.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Question ID</TableHead>
                        <TableHead>Question Text</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading.questions ? (
                          <TableRow><TableCell colSpan={3} className="text-center h-24"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                      ) : questions.length > 0 ? (
                          questions.map((question) => (
                            <TableRow key={question.id}>
                              <TableCell className="font-mono">{question.id}</TableCell>
                              <TableCell className="font-medium max-w-md truncate">{question.text}</TableCell>
                              <TableCell className="text-right space-x-2">
                                <Button variant="ghost" size="icon" title="Edit Question" disabled>
                                  <Edit />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Delete Question" disabled>
                                  <Trash2 />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                      ) : (
                          <TableRow>
                              <TableCell colSpan={3} className="text-center h-24">
                                  No questions in the bank yet.
                              </TableCell>
                          </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
             <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Session Results</CardTitle>
                        <Button size="sm" onClick={handleExportResults} disabled={sessionResults.length === 0}>
                           <Download className="mr-2" /> Export All
                        </Button>
                    </div>
                    <CardDescription>Review player performance and quiz outcomes from completed sessions.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading.results ? (
                        <div className="text-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                            <p className="mt-4 text-muted-foreground">Loading results...</p>
                        </div>
                    ) : sessionResults.length > 0 ? (
                        <p>Results table will be displayed here.</p> // This part can be implemented later
                    ) : (
                         <div className="text-center py-16 border-2 border-dashed rounded-lg">
                            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">No Session Results Found</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Completed quizzes will have their results displayed here.
                            </p>
                        </div>
                    )}
                </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
      
       <AddMapModal
          isOpen={isAddMapModalOpen}
          onClose={() => setIsAddMapModalOpen(false)}
          onSubmit={handleAddMap}
       />

       <AddQuizModal
          isOpen={isAddQuizModalOpen}
          onClose={() => setIsAddQuizModalOpen(false)}
          onSubmit={handleAddQuiz}
          availableMaps={maps}
       />

       <AddQuestionModal
          isOpen={isAddQuestionModalOpen}
          onClose={() => setIsAddQuestionModalOpen(false)}
          onSubmit={handleAddQuestion}
       />
    </div>
  );
}

    