
'use client';

import * as React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, PlusCircle, Edit, Trash2, Map, MapPin, HelpCircle, Users } from 'lucide-react';
import { AddQuizModal, QuizFormData } from '@/components/admin/AddQuizModal';
import { AddMapModal } from '@/components/admin/AddMapModal';
import { useToast } from "@/hooks/use-toast";

// Define interfaces for our data
interface AdminMap {
  id: string; // This is the map_identifier
  title: string;
  nodes: number;
  quizzes: number;
}

interface AdminQuiz {
    id: string; // question_id
    mapId: string; // map_identifier
    nodeId: string; // node_id from the DB
    question: string;
    type: string;
    options: string[];
    correctAnswer: string;
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
  const { toast } = useToast();

    // TODO: Implement fetching data from API endpoints in useEffect hooks
    // React.useEffect(() => {
    //   fetch('/api/maps/admin-summary').then(res => res.json()).then(setMaps);
    //   fetch('/api/quizzes/all').then(res => res.json()).then(setQuizzes);
    //   fetch('/api/sessions/results').then(res => res.json()).then(setSessionResults);
    // }, []);


  const handleExportResults = () => {
      console.log("Exporting session results...");
      const headers = "Session ID,Map Title,Date,Participants,Average Score\n";
      const csvContent = sessionResults.map(s =>
        `${s.id},"${s.mapTitle}",${s.date},${s.participants},${s.avgScore}`
      ).join("\n");
      const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      if (link.download !== undefined) {
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", "session_results.csv");
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
      } else {
        alert("CSV export is not supported in this browser.");
      }
  };
  
  const handleAddMap = async (data: { mapIdentifier: string; title: string; nodes: any[] }) => {
    const token = localStorage.getItem('token');
    if (!token) {
        toast({ title: "Error", description: "Authentication token not found.", variant: "destructive" });
        return;
    }
    
    try {
        const response = await fetch('/api/maps', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data) // Send the complete data object
        });

        const result = await response.json();

        if (response.ok) {
            toast({
                title: "Success!",
                description: `Map '${result.map.title}' has been created with ${result.map.nodes.length} node(s).`,
            });
            // Refetch or update local state
            const newMap: AdminMap = {
                id: result.map.map_identifier,
                title: result.map.title,
                nodes: result.map.nodes.length,
                quizzes: 0, // Initially no quizzes
            };
            setMaps(prevMaps => [...prevMaps, newMap]);
            setIsAddMapModalOpen(false);
        } else {
             toast({
                title: "Failed to Create Map",
                description: result.error || "An unknown error occurred.",
                variant: "destructive",
            });
        }
    } catch (error) {
         toast({
            title: "Network Error",
            description: "Could not connect to the server to create the map.",
            variant: "destructive",
        });
    }
  };


  const handleAddQuiz = async (data: QuizFormData) => {
    const token = localStorage.getItem('token');
    if (!token) {
        toast({ title: "Error", description: "Authentication token not found. Please log in.", variant: "destructive" });
        return;
    }

    const payload = {
      ...data,
      // The nodeId is now expected to be the numeric ID from the database
      nodeId: parseInt(data.nodeId, 10),
    };

     if (isNaN(payload.nodeId)) {
        toast({ title: "Invalid Input", description: "Node ID must be a valid number.", variant: "destructive" });
        return;
    }


    console.log('Sending new quiz data to API:', payload);

    try {
        const response = await fetch('/api/quizzes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            toast({
                title: "Success!",
                description: "New quiz has been created successfully.",
            });
            // You might want to refresh the quiz list here from the DB
            // For now, we'll just add the new quiz to the local state for immediate UI update.
            const newQuizForState: AdminQuiz = {
                id: result.question.question_id.toString(), // use new ID from DB
                mapId: data.mapId,
                nodeId: data.nodeId,
                question: data.question,
                type: data.type,
                options: data.options || [],
                correctAnswer: data.correctAnswer || 'N/A',
            };
            setQuizzes(prevQuizzes => [...prevQuizzes, newQuizForState]);
            setIsAddQuizModalOpen(false); // Close modal
        } else {
             toast({
                title: "Failed to Create Quiz",
                description: result.error || "An unknown error occurred.",
                variant: "destructive",
            });
        }
    } catch (error) {
         toast({
            title: "Network Error",
            description: "Could not connect to the server to create the quiz.",
            variant: "destructive",
        });
    }
  };


  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-primary">Admin Panel</h1>

        <Tabs defaultValue="maps">
          <TabsList className="mb-6">
            <TabsTrigger value="maps"><Map className="mr-2 h-4 w-4" /> Maps</TabsTrigger>
            <TabsTrigger value="quizzes"><HelpCircle className="mr-2 h-4 w-4" /> Quizzes</TabsTrigger>
            <TabsTrigger value="results"><Users className="mr-2 h-4 w-4" /> Session Results</TabsTrigger>
          </TabsList>

          <TabsContent value="maps">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                   <CardTitle>Manage Maps</CardTitle>
                   <Button size="sm" onClick={() => setIsAddMapModalOpen(true)}>
                       <PlusCircle className="mr-2 h-4 w-4" /> Add New Map
                    </Button>
                </div>
                <CardDescription>Create, edit, or delete learning maps and their nodes.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Map Title</TableHead>
                      <TableHead>Map Identifier</TableHead>
                      <TableHead>Nodes</TableHead>
                      <TableHead>Quizzes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maps.length > 0 ? (
                        maps.map((map) => (
                          <TableRow key={map.id}>
                            <TableCell className="font-medium">{map.title}</TableCell>
                            <TableCell className="font-mono">{map.id}</TableCell>
                            <TableCell>{map.nodes}</TableCell>
                             <TableCell>{map.quizzes}</TableCell>
                            <TableCell className="text-right space-x-2">
                               <Button variant="ghost" size="icon" title="Edit Map & Nodes">
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
                            <TableCell colSpan={5} className="text-center h-24">
                                Belum ada peta yang dibuat.
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
                       <CardTitle>Manage Quizzes</CardTitle>
                       <Button size="sm" onClick={() => setIsAddQuizModalOpen(true)}>
                           <PlusCircle className="mr-2 h-4 w-4" /> Add New Quiz
                        </Button>
                    </div>
                    <CardDescription>Create, edit, or delete quizzes associated with map nodes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Question/Instruction</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Associated Map</TableHead>
                         <TableHead>Associated Node ID</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {quizzes.length > 0 ? (
                            quizzes.map((quiz) => (
                            <TableRow key={quiz.id}>
                                <TableCell className="font-medium max-w-sm truncate">{quiz.question}</TableCell>
                                <TableCell>{quiz.type}</TableCell>
                                 <TableCell>{maps.find(m => m.id === quiz.mapId)?.title || 'N/A'}</TableCell>
                                 <TableCell>{quiz.nodeId}</TableCell>
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
                                <TableCell colSpan={5} className="text-center h-24">
                                    Belum ada kuis yang dibuat. Klik "Add New Quiz" untuk memulai.
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
                    <CardTitle>View Session Results</CardTitle>
                    <Button size="sm" variant="outline" onClick={handleExportResults} disabled={sessionResults.length === 0}>
                        <Download className="mr-2 h-4 w-4" /> Export Results (CSV)
                    </Button>
                 </div>
                <CardDescription>Review completed multiplayer sessions and participant scores.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Map Title</TableHead>
                      <TableHead>Date Completed</TableHead>
                      <TableHead>Participants</TableHead>
                      <TableHead>Average Score (%)</TableHead>
                       <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionResults.length > 0 ? (
                        sessionResults.map((session) => (
                          <TableRow key={session.id}>
                            <TableCell className="font-medium">{session.mapTitle}</TableCell>
                            <TableCell>{new Date(session.date).toLocaleDateString()}</TableCell>
                            <TableCell>{session.participants}</TableCell>
                            <TableCell>{session.avgScore}</TableCell>
                             <TableCell className="text-right">
                                <Button variant="link" size="sm">View Details</Button>
                             </TableCell>
                          </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24">
                                Belum ada hasil sesi yang tercatat.
                            </TableCell>
                        </TableRow>
                    )}
                  </TableBody>
                </Table>
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
    </div>
  );
}
