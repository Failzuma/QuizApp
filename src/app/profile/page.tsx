import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { List, CheckCircle } from 'lucide-react';


// Mock data - Replace with actual user data and history fetching
const userProfile = {
  name: 'Mahasiswa Polnep',
  email: 'mahasiswa@polnep.ac.id',
  avatarUrl: 'https://picsum.photos/seed/profile/100/100', // Placeholder image
  joinDate: '2024-01-15',
};

const sessionHistory = [
  { id: 'session1', mapTitle: 'English for IT - Vocabulary Basics', score: 85, date: '2024-07-20' },
  { id: 'session2', mapTitle: 'Basic English Grammar - Tenses', score: 92, date: '2024-07-21' },
  { id: 'session3', mapTitle: 'English for IT - Vocabulary Basics', score: 78, date: '2024-07-22' },
];

export default function ProfilePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-primary">My Profile</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* User Info Card */}
          <div className="md:col-span-1">
             <Card>
               <CardHeader className="items-center text-center">
                 <Avatar className="h-24 w-24 mb-4">
                   <AvatarImage src={userProfile.avatarUrl} alt={userProfile.name} />
                   <AvatarFallback>{userProfile.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                 </Avatar>
                 <CardTitle>{userProfile.name}</CardTitle>
                 <CardDescription>{userProfile.email}</CardDescription>
                 <Badge variant="secondary" className="mt-2">Joined: {new Date(userProfile.joinDate).toLocaleDateString()}</Badge>
               </CardHeader>
               {/* Add more profile details or actions here if needed */}
             </Card>
          </div>

          {/* Session History Card */}
          <div className="md:col-span-2">
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <List className="h-5 w-5" />
                   Session History
                 </CardTitle>
                 <CardDescription>Your recent activity and scores per session.</CardDescription>
               </CardHeader>
               <CardContent>
                 {sessionHistory.length > 0 ? (
                   <ul className="space-y-4">
                     {sessionHistory.map((session, index) => (
                       <li key={session.id}>
                         <div className="flex justify-between items-center">
                           <div>
                             <p className="font-medium">{session.mapTitle}</p>
                             <p className="text-sm text-muted-foreground">
                               Completed on {new Date(session.date).toLocaleDateString()}
                             </p>
                           </div>
                           <Badge variant={session.score >= 80 ? "default" : "outline"} className="text-lg font-semibold bg-primary text-primary-foreground">
                             {session.score}%
                           </Badge>
                         </div>
                         {index < sessionHistory.length - 1 && <Separator className="my-4" />}
                       </li>
                     ))}
                   </ul>
                 ) : (
                   <p className="text-muted-foreground">No session history yet. Start playing a map!</p>
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
