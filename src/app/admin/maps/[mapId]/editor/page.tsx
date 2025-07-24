
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';

const obstacleSchema = z.object({
  posX: z.coerce.number().min(0),
  posY: z.coerce.number().min(0),
  width: z.coerce.number().min(10),
  height: z.coerce.number().min(10),
});

type ObstacleFormData = z.infer<typeof obstacleSchema>;

interface ObstacleData extends ObstacleFormData {
  obstacle_id: number;
}

export default function MapEditorPage({ params }: { params: { mapId: string } }) {
  const { mapId } = params;
  const { toast } = useToast();
  const [obstacles, setObstacles] = React.useState<ObstacleData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const backgroundUrl = `/assets/images/backgrounds/${mapId}_background.png`;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ObstacleFormData>({
    resolver: zodResolver(obstacleSchema),
    defaultValues: {
      posX: 100,
      posY: 100,
      width: 50,
      height: 50,
    },
  });

  React.useEffect(() => {
    const fetchObstacles = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/maps/${mapId}/obstacles`);
        if (!response.ok) {
          throw new Error('Failed to fetch obstacles');
        }
        const data = await response.json();
        setObstacles(data);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Could not load obstacle data.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchObstacles();
  }, [mapId, toast]);

  const handleAddObstacle = async (data: ObstacleFormData) => {
    setIsSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/maps/${mapId}/obstacles`, {
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
          description: 'Obstacle added successfully.',
        });
        setObstacles((prev) => [...prev, result.obstacle]);
        reset();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add obstacle.',
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
  
  const handleDeleteObstacle = async (obstacleId: number) => {
    // Note: The DELETE endpoint is not implemented in this pass.
    // This is a placeholder for the UI.
    toast({
        title: "Info",
        description: "DELETE functionality is not yet implemented.",
    });
    // Example of how it would work:
    // setObstacles(obstacles.filter(o => o.obstacle_id !== obstacleId));
  }


  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Map Editor</h1>
        <p className="text-muted-foreground mb-6">Editing map: <span className="font-mono text-primary">{mapId}</span></p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Map Preview</CardTitle>
                <CardDescription>Visual representation of the map and its obstacles.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative w-full aspect-video bg-muted border rounded-md overflow-hidden">
                  <img src={backgroundUrl} alt={`Background for ${mapId}`} className="w-full h-full object-cover" onError={(e) => e.currentTarget.src = 'https://placehold.co/1280x720.png'}/>
                  {isLoading ? (
                     <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Loader2 className="h-8 w-8 animate-spin text-white"/>
                     </div>
                  ) : (
                    obstacles.map((obs) => (
                      <div
                        key={obs.obstacle_id}
                        className="absolute bg-red-500/50 border-2 border-red-700"
                        style={{
                          left: `${(obs.posX / 1280) * 100}%`, // Example based on a 1280px wide image
                          top: `${(obs.posY / 720) * 100}%`,  // Example based on a 720px high image
                          width: `${(obs.width / 1280) * 100}%`,
                          height: `${(obs.height / 720) * 100}%`,
                        }}
                      >
                         <span className="text-xs text-white p-1 bg-red-800/80 absolute -top-1 -left-1">{obs.obstacle_id}</span>
                      </div>
                    ))
                  )}
                </div>
                 <p className="text-xs text-muted-foreground mt-2">Note: Preview assumes a 1280x720 map aspect ratio for positioning.</p>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Manage Obstacles</CardTitle>
                 <CardDescription>Add or remove collision areas for this map.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(handleAddObstacle)} className="space-y-4 mb-6 p-4 border rounded-lg">
                    <h3 className="font-semibold text-lg">Add New Obstacle</h3>
                    <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                            <Label htmlFor="posX">X</Label>
                            <Input id="posX" type="number" {...register('posX')} />
                            {errors.posX && <p className="text-xs text-destructive">{errors.posX.message}</p>}
                        </div>
                         <div className="space-y-1">
                            <Label htmlFor="posY">Y</Label>
                            <Input id="posY" type="number" {...register('posY')} />
                            {errors.posY && <p className="text-xs text-destructive">{errors.posY.message}</p>}
                        </div>
                         <div className="space-y-1">
                            <Label htmlFor="width">Width</Label>
                            <Input id="width" type="number" {...register('width')} />
                             {errors.width && <p className="text-xs text-destructive">{errors.width.message}</p>}
                        </div>
                         <div className="space-y-1">
                            <Label htmlFor="height">Height</Label>
                            <Input id="height" type="number" {...register('height')} />
                            {errors.height && <p className="text-xs text-destructive">{errors.height.message}</p>}
                        </div>
                    </div>
                     <Button type="submit" disabled={isSubmitting} className="w-full">
                        {isSubmitting ? <Loader2 className="animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
                        Add Obstacle
                     </Button>
                </form>

                 <div className="space-y-2">
                     <h3 className="font-semibold text-lg">Existing Obstacles</h3>
                    {obstacles.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No obstacles added yet.</p>
                    ) : (
                        <ul className="space-y-2 max-h-60 overflow-y-auto">
                            {obstacles.map(obs => (
                                <li key={obs.obstacle_id} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                                    <span>ID: {obs.obstacle_id} (X:{obs.posX}, Y:{obs.posY})</span>
                                     <Button variant="ghost" size="icon" onClick={() => handleDeleteObstacle(obs.obstacle_id)}>
                                        <Trash2 className="h-4 w-4 text-destructive"/>
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
