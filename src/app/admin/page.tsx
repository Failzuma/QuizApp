
'use client'; // Add 'use client' directive

import * as React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, PlusCircle, Edit, Trash2, Map, MapPin, HelpCircle, Users } from 'lucide-react';
import { AddQuizModal, QuizFormData } from '@/components/admin/AddQuizModal'; // Import the modal component

// Mock Data - Replace with actual data fetching later
const mockMaps = [
  { id: 'map1', title: 'English for IT - Vocabulary Basics', nodes: 15, quizzes: 10 },
  { id: 'map2', title: 'Basic English Grammar - Tenses', nodes: 12, quizzes: 8 },
  { id: 'map3', title: 'Networking Concepts Map', nodes: 20, quizzes: 15 }, // Added map3 for quiz example
];

// Use React state for quizzes so it can be updated
const initialMockQuizzes = [
    { id: 'q1', mapId: 'map1', nodeId: 'node3', question: 'What does CPU stand for?', type: 'Short Answer', options: [], correctAnswer: 'Central Processing Unit' },
    { id: 'q2', mapId: 'map1', nodeId: 'node7', question: 'Match the term to its definition.', type: 'Matching', options: ['CPU:Central Processing Unit', 'RAM:Random Access Memory'], correctAnswer: 'N/A'}, // Matching options format
    { id: 'q3', mapId: 'map2', nodeId: 'node2', question: 'Choose the correct past tense verb.', type: 'Multiple Choice', options: ['go', 'went', 'gone', 'goes'], correctAnswer: 'went' },
    { id: 'q4', mapId: 'map3', nodeId: 'node_osi', question: 'Order the first 3 layers of the OSI model (bottom-up).', type: 'Sequencing', options: ['Physical', 'Data Link', 'Network'], correctAnswer: 'N/A'}, // Sequencing uses options order
    { id: 'q5', mapId: 'map1', nodeId: 'node_ports', question: 'Drag the protocol to the correct port number.', type: 'Drag & Drop', options: ['HTTP', 'HTTPS', 'FTP'], correctAnswer: 'N/A' }, // D&D items in options
    { id: 'q6', mapId: 'map3', nodeId: 'node_router_pic', question: 'Click on the antenna of the router.', type: 'Hotspot', options: [], correctAnswer: 'N/A' },
    { id: 'q7', mapId: 'map1', nodeId: 'node_scramble', question: 'nrtwoek', type: 'Scramble', options: [], correctAnswer: 'network' },
];


const mockSessionResults = [
  { id: 'session1', mapTitle: 'English for IT - Vocabulary Basics', date: '2024-07-20', participants: 5, avgScore: 82 },
  { id: 'session2', mapTitle: 'Basic English Grammar - Tenses', date: '2024-07-21', participants: 8, avgScore: 88 },
];

export default function AdminPage() {
  const [isAddQuizModalOpen, setIsAddQuizModalOpen] = React.useState(false);
  const [quizzes, setQuizzes] = React.useState(initialMockQuizzes);

  // TODO: Add role-based access control check here (consider moving logic if this becomes complex server-side check)

  const handleExportResults = () => {
      console.log("Exporting session results...");
      const headers = "Session ID,Map Title,Date,Participants,Average Score\n";
      const csvContent = mockSessionResults.map(s =>
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

  const handleAddQuiz = (data: QuizFormData) => {
    console.log('New Quiz Data:', data);
    // Create a new quiz object based on the form data
    const newQuiz = {
      id: `q${Date.now()}`, // Use timestamp for more unique ID in mock data
      mapId: data.mapId,
      nodeId: data.nodeId,
      question: data.question,
      type: data.type,
      options: data.options || [], // Use processed options
      correctAnswer: data.correctAnswer || 'N/A', // Use processed correct answer
    };
    setQuizzes(prevQuizzes => [...prevQuizzes, newQuiz]);
    setIsAddQuizModalOpen(false); // Close modal on successful submission
  };


  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-primary">Admin Panel</h1>

        <Tabs defaultValue="quizzes"> {/* Default to quizzes tab */}
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
                         <TableHead>Associated Node</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {quizzes.map((quiz) => (
                        <TableRow key={quiz.id}>
                            <TableCell className="font-medium max-w-sm truncate">{quiz.question}</TableCell> {/* Wider column */}
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

       {/* Add Quiz Modal */}
       <AddQuizModal
          isOpen={isAddQuizModalOpen}
          onClose={() => setIsAddQuizModalOpen(false)}
          onSubmit={handleAddQuiz}
          availableMaps={mockMaps}
       />
    </div>
  );
}
