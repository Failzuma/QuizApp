'use client'; // Add 'use client' directive

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, PlusCircle, Edit, Trash2, Map, MapPin, HelpCircle, Users } from 'lucide-react';

// Mock Data - Replace with actual data fetching later
const mockMaps = [
  { id: 'map1', title: 'English for IT - Vocabulary Basics', nodes: 15, quizzes: 10 },
  { id: 'map2', title: 'Basic English Grammar - Tenses', nodes: 12, quizzes: 8 },
];

const mockQuizzes = [
    { id: 'q1', mapId: 'map1', nodeId: 'node3', question: 'What does CPU stand for?', type: 'Short Answer'},
    { id: 'q2', mapId: 'map1', nodeId: 'node7', question: 'Match the term to its definition.', type: 'Matching'},
    { id: 'q3', mapId: 'map2', nodeId: 'node2', question: 'Choose the correct past tense verb.', type: 'Multiple Choice'},
];

const mockSessionResults = [
  { id: 'session1', mapTitle: 'English for IT - Vocabulary Basics', date: '2024-07-20', participants: 5, avgScore: 82 },
  { id: 'session2', mapTitle: 'Basic English Grammar - Tenses', date: '2024-07-21', participants: 8, avgScore: 88 },
];

export default function AdminPage() {
  // TODO: Add role-based access control check here (consider moving logic if this becomes complex server-side check)

  const handleExportResults = () => {
      // This function uses browser APIs, so it's suitable for a Client Component
      console.log("Exporting session results...");
      const headers = "Session ID,Map Title,Date,Participants,Average Score\n";
      const csvContent = mockSessionResults.map(s =>
        `${s.id},"${s.mapTitle}",${s.date},${s.participants},${s.avgScore}`
      ).join("\n");
      const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      if (link.download !== undefined) { // feature detection
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", "session_results.csv");
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url); // Clean up object URL
      } else {
        // Fallback or error message if download attribute is not supported
        alert("CSV export is not supported in this browser.");
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

          {/* Map Management Tab */}
          <TabsContent value="maps">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                   <CardTitle>Manage Maps</CardTitle>
                   <Button size="sm">
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
                      <TableHead>Nodes</TableHead>
                      <TableHead>Quizzes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockMaps.map((map) => (
                      <TableRow key={map.id}>
                        <TableCell className="font-medium">{map.title}</TableCell>
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
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quiz Management Tab */}
            <TabsContent value="quizzes">
                <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                       <CardTitle>Manage Quizzes</CardTitle>
                       <Button size="sm">
                           <PlusCircle className="mr-2 h-4 w-4" /> Add New Quiz
                        </Button>
                    </div>
                    <CardDescription>Create, edit, or delete quizzes associated with map nodes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Question Snippet</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Associated Map</TableHead>
                         <TableHead>Associated Node</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mockQuizzes.map((quiz) => (
                        <TableRow key={quiz.id}>
                            <TableCell className="font-medium max-w-xs truncate">{quiz.question}</TableCell>
                            <TableCell>{quiz.type}</TableCell>
                             <TableCell>{mockMaps.find(m => m.id === quiz.mapId)?.title || 'N/A'}</TableCell>
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
                        ))}
                    </TableBody>
                    </Table>
                </CardContent>
                </Card>
            </TabsContent>

          {/* Session Results Tab */}
          <TabsContent value="results">
            <Card>
              <CardHeader>
                 <div className="flex justify-between items-center">
                    <CardTitle>View Session Results</CardTitle>
                    {/* Button onClick is now allowed because this is a Client Component */}
                    <Button size="sm" variant="outline" onClick={handleExportResults}>
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
                    {mockSessionResults.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">{session.mapTitle}</TableCell>
                        <TableCell>{new Date(session.date).toLocaleDateString()}</TableCell>
                        <TableCell>{session.participants}</TableCell>
                        <TableCell>{session.avgScore}</TableCell>
                         <TableCell className="text-right">
                            <Button variant="link" size="sm">View Details</Button> {/* Link to detailed session view later */}
                         </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
