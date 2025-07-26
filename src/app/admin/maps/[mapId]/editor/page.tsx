
'use client';

import * as React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, MousePointerClick, Trash2, MapPin, RectangleHorizontal } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// --- Types ---
interface BaseProperties {
    id: number | string; // Allow string for draft IDs
    posX: number;
    posY: number;
}
interface Node extends BaseProperties {
    title?: string | null;
}
interface Obstacle extends BaseProperties {
    width: number;
    height: number;
}

export default function MapEditorPage({ params }: { params: { mapId: string } }) {
    const { mapId } = params;
    const { toast } = useToast();

    // --- State ---
    const [nodes, setNodes] = React.useState<Node[]>([]);
    const [obstacles, setObstacles] = React.useState<Obstacle[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [imageDimensions, setImageDimensions] = React.useState({ width: 1280, height: 720 });
    
    // Interaction state
    const [interactionMode, setInteractionMode] = React.useState<'idle' | 'drawing' | 'dragging'>('idle');
    const [startPos, setStartPos] = React.useState({ x: 0, y: 0 });
    const [draggedNode, setDraggedNode] = React.useState<Node | null>(null);
    const [currentRect, setCurrentRect] = React.useState<Obstacle | null>(null);

    const mapContainerRef = React.useRef<HTMLDivElement>(null);
    const backgroundUrl = `/assets/images/backgrounds/${mapId}_background.png`;

    // --- Data Fetching ---
    React.useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [nodesRes, obstaclesRes] = await Promise.all([
                    fetch(`/api/maps/${mapId}/nodes`),
                    fetch(`/api/maps/${mapId}/obstacles`)
                ]);
                if (!nodesRes.ok) throw new Error('Failed to fetch nodes.');
                if (!obstaclesRes.ok) throw new Error('Failed to fetch obstacles.');
                const nodesData = await nodesRes.json();
                const obstaclesData = await obstaclesRes.json();
                setNodes(nodesData.map((n: any) => ({ ...n, id: n.node_id })));
                setObstacles(obstaclesData.map((o: any) => ({ ...o, id: o.obstacle_id })));
            } catch (error) {
                toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [mapId, toast]);
    
    // --- Utility Functions ---
    const getScaledCoords = (e: MouseEvent | React.MouseEvent) => {
        if (!mapContainerRef.current) return { x: 0, y: 0 };
        const rect = mapContainerRef.current.getBoundingClientRect();
        const scaleX = imageDimensions.width / rect.width;
        const scaleY = imageDimensions.height / rect.height;
        return {
            x: Math.round((e.clientX - rect.left) * scaleX),
            y: Math.round((e.clientY - rect.top) * scaleY),
        };
    };

    // --- Event Handlers ---
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, activeTab: 'nodes' | 'obstacles') => {
        if (e.button !== 0) return;
        setInteractionMode(activeTab === 'obstacles' ? 'drawing' : 'idle');
        const pos = getScaledCoords(e);
        setStartPos(pos);
        if (activeTab === 'obstacles') {
             setCurrentRect({ id: `draft-${Date.now()}`, posX: pos.x, posY: pos.y, width: 0, height: 0 });
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (interactionMode === 'idle') return;

        if (interactionMode === 'dragging' && draggedNode) {
            const pos = getScaledCoords(e);
            setNodes(prev => prev.map(n => n.id === draggedNode.id ? { ...n, posX: pos.x, posY: pos.y } : n));
        }
        if (interactionMode === 'drawing' && currentRect) {
            const pos = getScaledCoords(e);
            const width = Math.abs(pos.x - startPos.x);
            const height = Math.abs(pos.y - startPos.y);
            const newPosX = Math.min(pos.x, startPos.x);
            const newPosY = Math.min(pos.y, startPos.y);
            setCurrentRect({ ...currentRect, posX: newPosX, posY: newPosY, width, height });
        }
    };
    
    const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        // Create obstacle if drawing
        if (interactionMode === 'drawing' && currentRect) {
            if (currentRect.width > 5 && currentRect.height > 5) {
                setObstacles(prev => [...prev, currentRect]);
                toast({ title: "Obstacle Added", description: "Click save to commit." });
            }
            setCurrentRect(null);
        }
        // Reset interaction state
        setInteractionMode('idle');
        setDraggedNode(null);
    };

    const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Prevent creating node if mouse was dragged (for drawing)
        const distance = Math.sqrt(Math.pow(e.clientX - startPos.x, 2) + Math.pow(e.clientY - startPos.y, 2));
        if (distance > 5) return;

        const { x, y } = getScaledCoords(e);
        const newNode: Node = { id: `draft-${Date.now()}`, posX: x, posY: y, title: 'New Node' };
        setNodes(prev => [...prev, newNode]);
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            const nodesPayload = nodes.map(({ id, ...rest }) => ({ ...rest, node_id: typeof id === 'number' ? id : undefined }));
            const obstaclesPayload = obstacles.map(({ id, ...rest }) => ({ ...rest, obstacle_id: typeof id === 'number' ? id : undefined }));

            const [nodesRes, obstaclesRes] = await Promise.all([
                fetch(`/api/maps/${mapId}/nodes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    body: JSON.stringify(nodesPayload)
                }),
                fetch(`/api/maps/${mapId}/obstacles`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    body: JSON.stringify(obstaclesPayload)
                })
            ]);
            
            const nodesResult = await nodesRes.json();
            const obstaclesResult = await obstaclesRes.json();

            if (!nodesRes.ok) throw new Error(nodesResult.error || 'Failed to save nodes.');
            if (!obstaclesRes.ok) throw new Error(obstaclesResult.error || 'Failed to save obstacles.');

            toast({ title: "Success!", description: "All changes have been saved." });
            setNodes(nodesResult.nodes.map((n:any) => ({...n, id: n.node_id})));
            setObstacles(obstaclesResult.obstacles.map((o:any) => ({...o, id: o.obstacle_id})));

        } catch (error) {
            toast({ title: 'Save Failed', description: (error as Error).message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };
    
    // --- Render ---
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
                        Save All Changes
                    </Button>
                </div>

                <Tabs defaultValue="nodes" className="w-full">
                    <TabsList>
                        <TabsTrigger value="nodes">Edit Nodes</TabsTrigger>
                        <TabsTrigger value="obstacles">Edit Obstacles</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="nodes">
                        <EditorCanvas
                            imageDimensions={imageDimensions}
                            backgroundUrl={backgroundUrl}
                            setImageDimensions={setImageDimensions}
                            mapContainerRef={mapContainerRef}
                            onMouseDown={(e) => handleMouseDown(e, 'nodes')}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMapClick={handleMapClick}
                            isLoading={isLoading}
                        >
                            {nodes.map(node => (
                                <div key={node.id} 
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                                    style={{ left: node.posX, top: node.posY, transform: `scale(${1280 / imageDimensions.width})` }}
                                    onMouseDown={(e) => { e.stopPropagation(); setInteractionMode('dragging'); setDraggedNode(node); }}
                                >
                                    <MapPin className="text-blue-500 w-8 h-8 drop-shadow-lg cursor-grab active:cursor-grabbing"/>
                                </div>
                            ))}
                        </EditorCanvas>
                    </TabsContent>
                    
                    <TabsContent value="obstacles">
                       <EditorCanvas
                            imageDimensions={imageDimensions}
                            backgroundUrl={backgroundUrl}
                            setImageDimensions={setImageDimensions}
                            mapContainerRef={mapContainerRef}
                            onMouseDown={(e) => handleMouseDown(e, 'obstacles')}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            isLoading={isLoading}
                            className="cursor-crosshair"
                        >
                            {obstacles.map(o => (
                                 <div key={o.id}
                                    className="absolute bg-red-500/50 border-2 border-red-700"
                                    style={{ left: o.posX, top: o.posY, width: o.width, height: o.height }}
                                 />
                            ))}
                            {currentRect && <div className="absolute bg-yellow-500/50 border-2 border-yellow-700" style={{ left: currentRect.posX, top: currentRect.posY, width: currentRect.width, height: currentRect.height }}/>}
                        </EditorCanvas>
                    </TabsContent>
                </Tabs>
            </main>
            <Footer />
        </div>
    );
}

function EditorCanvas({ children, imageDimensions, backgroundUrl, setImageDimensions, mapContainerRef, className, isLoading, ...props }: any) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Interactive Map</CardTitle>
            </CardHeader>
            <CardContent>
                <div
                    ref={mapContainerRef}
                    className={`relative w-full bg-muted border rounded-md overflow-hidden ${className}`}
                    style={{ 
                        width: '100%',
                        height: 'auto',
                        aspectRatio: `${imageDimensions.width} / ${imageDimensions.height}` 
                    }}
                    {...props}
                >
                    <img
                        src={backgroundUrl}
                        alt="Map Background"
                        className="absolute top-0 left-0 w-full h-full object-cover select-none"
                        onLoad={(e) => setImageDimensions({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
                        draggable={false}
                    />
                    <div className="absolute top-0 left-0 w-full h-full" style={{ transform: `scale(${mapContainerRef.current?.clientWidth / imageDimensions.width})`, transformOrigin: 'top left' }}>
                        {children}
                    </div>
                     {isLoading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-white"/></div>}
                </div>
            </CardContent>
        </Card>
    );
}
