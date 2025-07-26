
'use client';

import * as React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, MousePointerClick, Trash2, MapPin } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Types
interface Node {
    node_id: number;
    posX: number;
    posY: number;
    title?: string | null;
}

// Represents a node that is yet to be saved to the DB.
// The ID is temporary for keying purposes.
type DraftNode = Omit<Node, 'node_id'> & { id: string };

export default function MapEditorPage({ params }: { params: { mapId: string } }) {
    const { mapId } = params;
    const { toast } = useToast();
    
    // Server state
    const [initialNodes, setInitialNodes] = React.useState<Node[]>([]);
    
    // Draft state for local changes
    const [draftNodes, setDraftNodes] = React.useState<Array<Node | DraftNode>>([]);
    
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [imageDimensions, setImageDimensions] = React.useState({ width: 1280, height: 720 });
    const mapContainerRef = React.useRef<HTMLDivElement>(null);

    const backgroundUrl = `/assets/images/backgrounds/${mapId}_background.png`;

    // Fetch initial data
    React.useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/maps/${mapId}/nodes`);
                if (!response.ok) throw new Error('Failed to fetch map data.');
                const data: Node[] = await response.json();
                setInitialNodes(data);
                setDraftNodes(data);
            } catch (error) {
                toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [mapId, toast]);

    const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!mapContainerRef.current) return;

        const rect = mapContainerRef.current.getBoundingClientRect();
        const scaleX = imageDimensions.width / rect.width;
        const scaleY = imageDimensions.height / rect.height;

        const posX = Math.round((event.clientX - rect.left) * scaleX);
        const posY = Math.round((event.clientY - rect.top) * scaleY);
        
        const newNode: DraftNode = {
            id: `draft-${Date.now()}`,
            posX,
            posY,
            title: `New Node`
        };

        setDraftNodes(prev => [...prev, newNode]);
        toast({ title: "Node Added", description: "Click 'Save Changes' to commit." });
    };
    
    const handleDeleteNode = (id: number | string) => {
        setDraftNodes(prev => prev.filter(n => 'node_id' in n ? n.node_id !== id : n.id !== id));
        toast({ title: "Node Removed", description: "This change is local. Click 'Save Changes'." });
    }

    const handleSaveChanges = async () => {
        setIsSaving(true);
        const token = localStorage.getItem('token');
        try {
            // Here we would create/update/delete nodes.
            // For simplicity in this step, we'll just implement a bulk update/create.
            // A more robust solution would track new, updated, and deleted nodes separately.
            
            const payload = draftNodes.map(n => ({
                // If it has node_id, it's an existing node. Otherwise, it's new.
                node_id: 'node_id' in n ? n.node_id : undefined,
                posX: n.posX,
                posY: n.posY,
                title: n.title,
            }));

            const response = await fetch(`/api/maps/${mapId}/nodes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to save changes.');

            toast({ title: "Success!", description: "Map nodes have been saved." });
            setDraftNodes(result.nodes); // Update state with data from server (including new IDs)
            setInitialNodes(result.nodes);

        } catch (error) {
            toast({ title: 'Save Failed', description: (error as Error).message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-3xl font-bold">Visual Map Editor</h1>
                        <p className="text-muted-foreground">Editing map: <span className="font-mono text-primary">{mapId}</span></p>
                    </div>
                    <Button onClick={handleSaveChanges} disabled={isSaving || isLoading}>
                        {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                        Save Changes
                    </Button>
                </div>

                <Tabs defaultValue="nodes">
                    <TabsList>
                        <TabsTrigger value="nodes">Edit Nodes</TabsTrigger>
                        <TabsTrigger value="obstacles" disabled>Edit Obstacles (Coming Soon)</TabsTrigger>
                    </TabsList>
                    <TabsContent value="nodes">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
                            <div className="lg:col-span-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Interactive Map</CardTitle>
                                        <CardDescription>Click on the map to add a new node. Drag-and-drop functionality coming soon.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div
                                            ref={mapContainerRef}
                                            className="relative w-full bg-muted border rounded-md overflow-hidden cursor-crosshair"
                                            style={{ aspectRatio: `${imageDimensions.width} / ${imageDimensions.height}` }}
                                            onClick={handleMapClick}
                                        >
                                            <img
                                                src={backgroundUrl}
                                                alt="Map Background"
                                                className="w-full h-full object-cover"
                                                onLoad={(e) => {
                                                    const img = e.currentTarget;
                                                    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                                                }}
                                                onError={(e) => e.currentTarget.style.display = 'none'}
                                            />
                                            {draftNodes.map(node => (
                                                <div
                                                    key={'node_id' in node ? node.node_id : node.id}
                                                    className="absolute flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                                                    style={{
                                                        left: `${(node.posX / imageDimensions.width) * 100}%`,
                                                        top: `${(node.posY / imageDimensions.height) * 100}%`,
                                                    }}
                                                    onClick={(e) => e.stopPropagation()} // Prevent creating new node when clicking existing one
                                                    title={`Node (${node.posX}, ${node.posY})`}
                                                >
                                                     <MapPin className="text-white w-4 h-4"/>
                                                </div>
                                            ))}
                                             {isLoading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-white"/></div>}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="lg:col-span-1">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Manage Nodes</CardTitle>
                                        <CardDescription>Review and remove nodes. Positional editing coming soon.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2 max-h-[500px] overflow-y-auto">
                                            {draftNodes.map(node => (
                                                <li key={'node_id' in node ? node.node_id : node.id} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                                                    <span>
                                                        {'node_id' in node ? `Node ID: ${node.node_id}` : `New Node`}
                                                        <span className="text-muted-foreground ml-2">({node.posX}, {node.posY})</span>
                                                    </span>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteNode('node_id' in node ? node.node_id : node.id)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </li>
                                            ))}
                                            {draftNodes.length === 0 && <p className="text-center text-muted-foreground py-4">No nodes yet. Click on the map to add one.</p>}
                                        </ul>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
            <Footer />
        </div>
    );
}
