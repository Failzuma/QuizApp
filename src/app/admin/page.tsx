
'use client';

import * as React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, PlusCircle, Edit, Trash2, Map, MapPin, HelpCircle, Users, Loader2, BookOpen } from 'lucide-react';
import { AddQuizModal, QuizFormData } from '@/components/admin/AddQuizModal';
import { AddMapModal, MapBlueprintFormData } from '@/components/admin/AddMapModal';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

interface AdminMap {
  id: string;
  title: string;
  nodes: number;
}

interface AdminQuiz {
    id: number; // Now quiz_id
    title: string;
    mapId: string;
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
  const [quizzes, setQuizzes] = React.useState<AdminQuiz[]>([]);
  const [maps, setMaps] = React.useState<AdminMap[]>([]);
  const [sessionResults, setSessionResults] = React.useState<SessionResult[]>([]);
  const [isLoading, setIsLoading] = React.useState({ maps: true, quizzes: true, results: true });
  const { toast } = useToast();
  const router = useRouter();

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(prev => ({ ...prev, maps: true, quizzes: true }));
        
        // Fetch Maps (Blueprints)
        const mapsResponse = await fetch('/api/maps/admin-summary'); // A new endpoint to get summary
        const mapsData = await mapsResponse.json();
        setMaps(mapsData);

        // Fetch Quizzes (Playable Instances)
        const quizzesResponse = await fetch('/api/quizzes'); // This now fetches playable quizzes
        const quizzesData = await quizzesResponse.json();
        const formattedQuizzes = quizzesData.map((q: any) => ({ id: q.id, title: q.title, mapId: q.mapId }));
        setQuizzes(formattedQuizzes);
        
      } catch (error) {
        console.error("Failed to fetch admin data", error);
        toast({ title: "Error", description: "Could not load admin data.", variant: "destructive" });
      } finally {
        setIsLoading(prev => ({ ...prev, maps: false, quizzes: false, results: false }));
      }
    };
    fetchData();
  }, [toast]);


  const handleExportResults = () => {
      console.log("Exporting session results...");
      // Logic for exporting results...
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
        // This now creates a quiz *instance*, not a question
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

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-primary">Admin Panel</h1>

        <Tabs defaultValue="quizzes">
          <TabsList className="mb-6">
            <TabsTrigger value="quizzes"><BookOpen className="mr-2 h-4 w-4" /> Playable Quizzes</TabsTrigger>
            <TabsTrigger value="maps"><Map className="mr-2 h-4 w-4" /> Map Blueprints</TabsTrigger>
            <TabsTrigger value="questions"><HelpCircle className="mr-2 h-4 w-4" /> Question Bank</TabsTrigger>
            <TabsTrigger value="results"><Users className="mr-2 h-4 w-4" /> Session Results</TabsTrigger>
          </TabsList>

          <TabsContent value="maps">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                   <CardTitle>Manage Map Blueprints</CardTitle>
                   <Button size="sm" onClick={() => setIsAddMapModalOpen(true)}>
                       <PlusCircle className="mr-2 h-4 w-4" /> Add New Map Blueprint
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
                                   <MapPin className="h-4 w-4" />
                               </Button>
                              <Button variant="ghost" size="icon" title="Edit Map Info">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Delete Map">
                                <Trash2 className="h-4 w-4" />
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
                   <Button size="sm" onClick={() => setIsAddQuizModalOpen(true)}>
                       <PlusCircle className="mr-2 h-4 w-4" /> Add New Quiz
                    </Button>
                </div>
                <CardDescription>Create, edit, or delete playable quiz instances.</CardDescription>
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
                            <Button variant="ghost" size="icon" title="Edit Quiz">
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Delete Quiz">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                       <TableRow>
                            <TableCell colSpan={3} className="text-center h-24">
                                No quizzes created. Click "Add New Quiz" to start.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                </Table>
            </CardContent>
            </Card>
          </TabsContent>

          {/* Placeholder for Question Bank */}
          <TabsContent value="questions">
            <Card>
                <CardHeader>
                    <CardTitle>Question Bank</CardTitle>
                    <CardDescription>Manage all individual questions across all maps.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center">Feature coming soon.</p>
                </CardContent>
            </Card>
          </TabsContent>

          {/* Results Tab remains the same */}
          <TabsContent value="results">
            {/* ... existing session results content ... */}
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
    </div>
  );
}
