
'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from '../ui/separator';

const nodePositionSchema = z.object({
  posX: z.coerce.number().min(0, 'X position must be a positive number.'),
  posY: z.coerce.number().min(0, 'Y position must be a positive number.'),
});

const mapBlueprintSchema = z.object({
  title: z.string().min(3, 'Map title must be at least 3 characters.'),
  mapIdentifier: z.string()
    .min(3, 'Identifier must be at least 3 characters.')
    .regex(/^[a-z0-9_]+$/, 'Identifier can only contain lowercase letters, numbers, and underscores.'),
  nodes: z.array(nodePositionSchema).min(1, 'At least one node is required.').max(10, 'You can add a maximum of 10 nodes.'),
});

export type MapBlueprintFormData = z.infer<typeof mapBlueprintSchema>;

interface AddMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MapBlueprintFormData) => void;
}

export function AddMapModal({ isOpen, onClose, onSubmit }: AddMapModalProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MapBlueprintFormData>({
    resolver: zodResolver(mapBlueprintSchema),
    defaultValues: {
      title: '',
      mapIdentifier: '',
      nodes: [{ posX: 100, posY: 100 }],
    },
  });

  const { fields: nodeFields, append: appendNode, remove: removeNode } = useFieldArray({
    control,
    name: 'nodes',
  });
  
  React.useEffect(() => {
    if (!isOpen) {
      reset({
        title: '',
        mapIdentifier: '',
        nodes: [{ posX: 100, posY: 100 }],
      });
    }
  }, [isOpen, reset]);
  
  const handleFormSubmit = (data: MapBlueprintFormData) => {
    onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Map Blueprint</DialogTitle>
          <DialogDescription>
            Create a map blueprint by defining its title, a unique identifier, and the positions of each interactive node.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Map Title <span className="text-destructive">*</span></Label>
              <Input id="title" placeholder="e.g., English Grammar Dungeon" {...register('title')} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="mapIdentifier">Map Identifier <span className="text-destructive">*</span></Label>
              <Input id="mapIdentifier" placeholder="e.g., grammar_dungeon_1" {...register('mapIdentifier')} />
              {errors.mapIdentifier && <p className="text-sm text-destructive">{errors.mapIdentifier.message}</p>}
            </div>
          </div>
          
          <Separator />

          {/* Nodes Section */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Node Positions</Label>
            {errors.nodes?.root && <p className="text-sm text-destructive">{errors.nodes.root.message}</p>}
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
              {nodeFields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-3 relative bg-muted/50">
                   <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:text-destructive" onClick={() => removeNode(index)} disabled={nodeFields.length <= 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <h4 className="font-medium">Node {index + 1}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor={`nodes.${index}.posX`}>Position X <span className="text-destructive">*</span></Label>
                        <Input {...register(`nodes.${index}.posX`)} type="number" placeholder="e.g., 350"/>
                        {errors.nodes?.[index]?.posX && <p className="text-sm text-destructive">{errors.nodes[index]?.posX?.message}</p>}
                     </div>
                      <div className="space-y-1">
                        <Label htmlFor={`nodes.${index}.posY`}>Position Y <span className="text-destructive">*</span></Label>
                        <Input {...register(`nodes.${index}.posY`)} type="number" placeholder="e.g., 500"/>
                        {errors.nodes?.[index]?.posY && <p className="text-sm text-destructive">{errors.nodes[index]?.posY?.message}</p>}
                     </div>
                  </div>
                </div>
              ))}
            </div>
            {nodeFields.length < 10 && (
              <Button type="button" variant="outline" size="sm" onClick={() => appendNode({ posX: 0, posY: 0 })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Node Position
              </Button>
            )}
          </div>
          
          <Alert variant="default">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Important: Map Background Image</AlertTitle>
            <AlertDescription>
              After creating the map, you must manually add a background image named <strong>`[identifier]_background.png`</strong> to the `public/assets/images/backgrounds` folder. The X and Y positions are calculated from the top-left corner of this image.
            </AlertDescription>
          </Alert>

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Map Blueprint'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
