
'use client';

import * as React from 'react';
import Draggable from 'react-draggable';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, MousePointerClick, Trash2, MapPin, RectangleHorizontal } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// --- Types ---
interface BaseProperties {
    id: number;
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
type Draft<T> = Omit<T, 'id'> & { draftId: string };

export default function MapEditorPage({ params }: { params: { mapId: string } }) {
    const { mapId } = params;
    const { toast } = useToast();

    // --- State ---
    const [nodes, setNodes] = React.useState<Node[]>([]);
    const [obstacles, setObstacles] = React.useState<Obstacle[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [imageDimensions, setImageDimensions] = React.useState({ width: 1280, height: 720 });
    
    // Drawing state for obstacles
    const [isDrawing, setIsDrawing] = React.useState(false);
    const [startPos, setStartPos] = React.useState({ x: 0, y: 0 });
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
                setNodes(nodesData.map((n:any) => ({...n, id: n.node_id})));
                setObstacles(obstaclesData.map((o:any) => ({...o, id: o.obstacle_id})));
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

    // --- Node Handlers ---
    const handleNodeClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation(); // Prevent map click when clicking a node
        const { x, y } = getScaledCoords(e);
        const newNode: Node = { id: Date.now(), posX: x, posY: y, title: 'New Node' };
        setNodes(prev => [...prev, newNode]);
    };

    const handleNodeDragStop = (e: MouseEvent, data: { x: number, y: number }, nodeId: number) => {
        const { x: newPosX, y: newPosY } = getScaledCoords({ clientX: data.x, clientY: data.y } as MouseEvent);
         setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, posX: newPosX, posY: newPosY } : n));
    };
    
    // --- Obstacle Handlers ---
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.button !== 0) return; // Only left click
        e.stopPropagation();
        setIsDrawing(true);
        const pos = getScaledCoords(e);
        setStartPos(pos);
        setCurrentRect({ id: Date.now(), posX: pos.x, posY: pos.y, width: 0, height: 0 });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDrawing || !currentRect) return;
        e.stopPropagation();
        const pos = getScaledCoords(e);
        const width = Math.abs(pos.x - startPos.x);
        const height = Math.abs(pos.y - startPos.y);
        const newPosX = Math.min(pos.x, startPos.x);
        const newPosY = Math.min(pos.y, startPos.y);
        setCurrentRect({ ...currentRect, posX: newPosX, posY: newPosY, width, height });
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDrawing || !currentRect) return;
        e.stopPropagation();
        setIsDrawing(false);
        if (currentRect.width > 10 && currentRect.height > 10) {
            setObstacles(prev => [...prev, currentRect]);
            toast({ title: "Obstacle Added", description: "Click save to commit." });
        }
        setCurrentRect(null);
    };

    // --- Generic Handlers ---
     const handleDelete = (id: number, type: 'node' | 'obstacle') => {
        if (type === 'node') setNodes(prev => prev.filter(n => n.id !== id));
        else setObstacles(prev => prev.filter(o => o.id !== id));
        toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} Removed`, description: "Local change. Click save." });
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

                <Tabs defaultValue="nodes">
                    <TabsList>
                        <TabsTrigger value="nodes">Edit Nodes</TabsTrigger>
                        <TabsTrigger value="obstacles">Edit Obstacles</TabsTrigger>
                    </TabsList>
                    
                    {/* --- Nodes Tab --- */}
                    <TabsContent value="nodes">
                         <MapContainer
                            imageDimensions={imageDimensions}
                            backgroundUrl={backgroundUrl}
                            setImageDimensions={setImageDimensions}
                            mapContainerRef={mapContainerRef}
                            onMapClick={handleNodeClick}
                         >
                            {nodes.map(node => (
                                <Draggable
                                    key={node.id}
                                    position={{ x: (node.posX / imageDimensions.width) * (mapContainerRef.current?.clientWidth || 0), y: (node.posY / imageDimensions.height) * (mapContainerRef.current?.clientHeight || 0) }}
                                    onStop={(e, data) => handleNodeDragStop(e as MouseEvent, data, node.id)}
                                >
                                    <div className="absolute cursor-grab active:cursor-grabbing">
                                        <MapPin className="text-blue-500 w-8 h-8 drop-shadow-lg" />
                                    </div>
                                </Draggable>
                            ))}
                         </MapContainer>
                    </TabsContent>
                    
                    {/* --- Obstacles Tab --- */}
                    <TabsContent value="obstacles">
                        <MapContainer
                            imageDimensions={imageDimensions}
                            backgroundUrl={backgroundUrl}
                            setImageDimensions={setImageDimensions}
                            mapContainerRef={mapContainerRef}
                            className="cursor-crosshair"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                        >
                            {obstacles.map(o => (
                                 <div key={o.id}
                                    className="absolute bg-red-500/50 border-2 border-red-700"
                                    style={{
                                        left: `${(o.posX / imageDimensions.width) * 100}%`,
                                        top: `${(o.posY / imageDimensions.height) * 100}%`,
                                        width: `${(o.width / imageDimensions.width) * 100}%`,
                                        height: `${(o.height / imageDimensions.height) * 100}%`,
                                    }}
                                 />
                            ))}
                            {currentRect && <div className="absolute bg-yellow-500/50 border-2 border-yellow-700" style={{left: `${(currentRect.posX / imageDimensions.width) * 100}%`, top: `${(currentRect.posY / imageDimensions.height) * 100}%`, width: `${(currentRect.width / imageDimensions.width) * 100}%`, height: `${(currentRect.height / imageDimensions.height) * 100}%`}}/>}
                        </MapContainer>
                    </TabsContent>
                </Tabs>
            </main>
            <Footer />
        </div>
    );
}

// Reusable Map Container Component
function MapContainer({ children, imageDimensions, backgroundUrl, setImageDimensions, mapContainerRef, className, ...props }: any) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Interactive Map</CardTitle>
                <CardDescription>
                    {props.onMapClick ? "Click to add a new node. Drag to move." : "Click and drag to draw an obstacle."}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div
                    ref={mapContainerRef}
                    className={`relative w-full bg-muted border rounded-md overflow-hidden ${className}`}
                    style={{ aspectRatio: `${imageDimensions.width} / ${imageDimensions.height}` }}
                    {...props}
                >
                    <img
                        src={backgroundUrl}
                        alt="Map Background"
                        className="w-full h-full object-cover"
                        onLoad={(e) => setImageDimensions({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
                        onError={(e) => e.currentTarget.style.display = 'none'}
                    />
                    {children}
                </div>
            </CardContent>
        </Card>
    );
}
