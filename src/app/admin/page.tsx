
'use client';

import * as React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, PlusCircle, Edit, Trash2, Map, BookOpen, Users, Loader2, FileQuestion, PencilRuler } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AddMapModal, type MapBlueprintFormData } from '@/components/admin/AddMapModal';


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

interface SessionResult {
    id: string;
    mapTitle: string;
    date: string;
    participants: number;
    avgScore: number;
}

export default function AdminPage() {
  const [isAddMapModalOpen, setIsAddMapModalOpen] = React.useState(false);
  const [quizzes, setQuizzes] = React.useState<AdminQuiz[]>([]);
  const [maps, setMaps] = React.useState<AdminMap[]>([]);
  const [sessionResults, setSessionResults] = React.useState<SessionResult[]>([]);
  const [isLoading, setIsLoading] = React.useState({ maps: true, quizzes: true, results: true });
  const { toast } = useToast();
  const router = useRouter();

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    const fetchData = async () => {
      try {
        setIsLoading(prev => ({ ...prev, maps: true, quizzes: true, results: true }));
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
            setQuizzes(quizzesData);
        } else {
            throw new Error(quizzesData.error || 'Failed to fetch quizzes');
        }
        
      } catch (error: any) {
        console.error("Failed to fetch admin data", error);
        toast({ title: "Error", description: error.message || "Could not load admin data.", variant: "destructive" });
      } finally {
        setIsLoading(prev => ({ ...prev, maps: false, quizzes: false, results: false }));
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
            const newMap: AdminMap = { id: result.map.map_identifier, title: result.map.title, nodes: result.map.nodes.length };
            setMaps(prevMaps => [...prevMaps, newMap]);
            setIsAddMapModalOpen(false);
        } else {
             toast({ title: "Failed to Create Map", description: result.error || "An unknown error occurred.", variant: "destructive" });
        }
    } catch (error) {
         toast({ title: "Network Error", description: "Could not connect to the server.", variant: "destructive" });
    }
  };
  
  const handleCreateQuiz = async (event: React.FormEvent) => {
    event.preventDefault();
    const token = localStorage.getItem('token');
    const formData = new FormData(event.target as HTMLFormElement);
    const title = formData.get('quizTitle') as string;
    const mapId = formData.get('mapId') as string;

    try {
      const response = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title, mapIdentifier: mapId }),
      });
      const result = await response.json();
      if (response.ok) {
        toast({ title: "Quiz Created!", description: "Now you can edit it to add questions." });
        setQuizzes(prev => [...prev, { id: result.quiz.quiz_id, title: result.quiz.title, mapId: result.quiz.map_identifier }]);
        router.push(`/admin/quizzes/${result.quiz.quiz_id}/edit`);
      } else {
        toast({ title: "Error", description: result.error || "Failed to create quiz.", variant: "destructive" });
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
          <TabsList className="mb-6 grid w-full grid-cols-3 md:grid-cols-4 h-auto">
            <TabsTrigger value="quizzes"><BookOpen className="mr-2" /> Manage Quizzes</TabsTrigger>
            <TabsTrigger value="maps"><PencilRuler className="mr-2" /> Manage Maps</TabsTrigger>
            <TabsTrigger value="questions"><FileQuestion className="mr-2" /> Question Bank</TabsTrigger>
            <TabsTrigger value="results"><Users className="mr-2" /> Session Results</TabsTrigger>
          </TabsList>
          
          <TabsContent value="questions">
             <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                   <CardTitle>Global Question Bank</CardTitle>
                   <Button size="sm" asChild>
                       <Link href="/admin/create-question"><PlusCircle className="mr-2" /> Add New Question</Link>
                    </Button>
                </div>
                <CardDescription>These questions can be linked to any node in any quiz.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Feature to view/edit existing questions from the bank is coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>

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
                               <Button variant="outline" size="sm" onClick={() => router.push(`/admin/maps/${map.id}/editor`)}>
                                   <Map className="mr-2"/> Edit Obstacles
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <Card>
                    <CardHeader>
                        <CardTitle>Manage Playable Quizzes</CardTitle>
                        <CardDescription>View all created quizzes or edit them to link questions to nodes.</CardDescription>
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
                                     <Button variant="default" size="sm" onClick={() => router.push(`/admin/quizzes/${quiz.id}/edit`)}>
                                        <Edit className="mr-2"/> Edit
                                      </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Delete Quiz (Coming Soon)" disabled>
                                        <Trash2 />
                                    </Button>
                                    </TableCell>
                                </TableRow>
                                ))
                            ) : (
                               <TableRow>
                                    <TableCell colSpan={3} className="text-center h-24">
                                        No quizzes created yet. Use the form to create one.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                        </Table>
                    </CardContent>
                    </Card>
                </div>
                 <div className="md:col-span-1">
                     <Card>
                         <CardHeader>
                             <CardTitle>Create New Quiz</CardTitle>
                             <CardDescription>Start by creating a new quiz instance.</CardDescription>
                         </CardHeader>
                         <CardContent>
                             <form className="space-y-4" onSubmit={handleCreateQuiz}>
                                 <div className="space-y-1">
                                     <label htmlFor="quizTitle" className="text-sm font-medium">Quiz Title</label>
                                     <Input id="quizTitle" name="quizTitle" required placeholder="e.g. English Chapter 1" />
                                 </div>
                                 <div className="space-y-1">
                                     <label htmlFor="mapId" className="text-sm font-medium">Select Map</label>
                                     <select id="mapId" name="mapId" required className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                                         {maps.map(map => <option key={map.id} value={map.id}>{map.title}</option>)}
                                     </select>
                                 </div>
                                 <Button type="submit" className="w-full" disabled={maps.length === 0}>
                                    <PlusCircle className="mr-2"/> Create & Edit
                                 </Button>
                             </form>
                         </CardContent>
                     </Card>
                </div>
            </div>
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
                        <p>Results table will be displayed here.</p>
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
    </div>
  );
}
