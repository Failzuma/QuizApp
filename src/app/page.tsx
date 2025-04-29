import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Map, BookOpen, Users, Trophy } from 'lucide-react';
import Link from 'next/link';

// Placeholder for Pixel Art Icon - Replace with actual SVG or component later
const PixelMapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ imageRendering: 'pixelated' }}>
    <rect width="64" height="64" fill="hsl(var(--secondary))"/>
    {/* Simple Island Shape */}
    <path fill="hsl(var(--primary))" d="M12 20 H20 V24 H28 V20 H36 V28 H44 V36 H36 V44 H28 V40 H20 V32 H12 V20 Z" />
    {/* Water features */}
    <rect x="16" y="28" width="4" height="4" fill="hsl(var(--secondary))"/>
    {/* Tree/Structure placeholder */}
    <rect x="30" y="22" width="4" height="4" fill="hsl(var(--accent))"/>
    <rect x="30" y="18" width="4" height="4" fill="hsl(var(--accent))" opacity="0.7"/>
     {/* Path */}
    <rect x="20" y="36" width="8" height="2" fill="hsl(var(--muted-foreground))" opacity="0.5"/>
    <rect x="26" y="30" width="2" height="8" fill="hsl(var(--muted-foreground))" opacity="0.5"/>
  </svg>
);


export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <section className="text-center mb-12">
           <div className="inline-block p-4 bg-secondary rounded-lg mb-4">
            <PixelMapIcon />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-primary">
            Welcome to QuizApp!
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Explore interactive learning maps, conquer quizzes, and collaborate with classmates in a fun, gamified environment. Let's start the adventure!
          </p>
          <div className="space-x-4">
            <Button size="lg" asChild>
              <Link href="/dashboard">Explore Maps</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={<Map className="h-8 w-8 text-primary" />}
            title="Interactive Maps"
            description="Navigate visual 2D maps representing course materials."
          />
          <FeatureCard
            icon={<BookOpen className="h-8 w-8 text-primary" />}
            title="Engaging Quizzes"
            description="Test your knowledge with various interactive question types."
          />
          <FeatureCard
            icon={<Users className="h-8 w-8 text-primary" />}
            title="Multiplayer Rooms"
            description="Join rooms, see friends, and compete in real-time."
          />
           <FeatureCard
            icon={<Trophy className="h-8 w-8 text-primary" />}
            title="Session Leaderboards"
            description="Track your progress and see who tops the scoreboards in each session."
          />
        </section>
      </main>
      <Footer />
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="text-center hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="items-center">
         <div className="p-3 rounded-full bg-secondary mb-2">
           {icon}
         </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );
}
