
'use client';

import * as React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
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
import { Textarea } from '../ui/textarea';

const nodeSchema = z.object({
  title: z.string().min(3, 'Node title must be at least 3 characters.'),
  content: z.string().min(5, 'Node content must be at least 5 characters.'),
  posX: z.coerce.number().min(0, 'X position must be a positive number.'),
  posY: z.coerce.number().min(0, 'Y position must be a positive number.'),
});

const mapSchema = z.object({
  title: z.string().min(3, 'Map title must be at least 3 characters.'),
  mapIdentifier: z.string()
    .min(3, 'Identifier must be at least 3 characters.')
    .regex(/^[a-z0-9_]+$/, 'Identifier can only contain lowercase letters, numbers, and underscores.'),
  nodes: z.array(nodeSchema).min(1, 'At least one node is required.').max(10, 'You can add a maximum of 10 nodes.'),
});

// This is the type for the form data, not the final submission data
export type MapFormData = z.infer<typeof mapSchema>;

interface AddMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  // The onSubmit function now expects the final, structured data
  onSubmit: (data: { mapIdentifier: string; title: string; nodes: any[] }) => void;
}

export function AddMapModal({ isOpen, onClose, onSubmit }: AddMapModalProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MapFormData>({
    resolver: zodResolver(mapSchema),
    defaultValues: {
      title: '',
      mapIdentifier: '',
      nodes: [{ title: 'Starting Point', content: 'This is the first node.', posX: 100, posY: 100 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'nodes',
  });

  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      reset({
        title: '',
        mapIdentifier: '',
        nodes: [{ title: 'Starting Point', content: 'This is the first node.', posX: 100, posY: 100 }],
      });
    }
  }, [isOpen, reset]);

  // Wrapper for submit to ensure correct data structure is passed up
  const handleFormSubmit = (data: MapFormData) => {
    const payload = {
      mapIdentifier: data.mapIdentifier,
      title: data.title,
      nodes: data.nodes, // nodes array is already in the correct format
    };
    onSubmit(payload);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Map Blueprint</DialogTitle>
          <DialogDescription>
            Create a map with its title, a unique identifier, and define the positions for each interactive node.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Map Title <span className="text-destructive">*</span></Label>
              <Input id="title" placeholder="e.g., Anatomy of a Cell" {...register('title')} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="mapIdentifier">Map Identifier <span className="text-destructive">*</span></Label>
              <Input id="mapIdentifier" placeholder="e.g., cell_anatomy_101" {...register('mapIdentifier')} />
              {errors.mapIdentifier && <p className="text-sm text-destructive">{errors.mapIdentifier.message}</p>}
            </div>
          </div>
          
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Interactive Nodes</Label>
            {errors.nodes?.root && <p className="text-sm text-destructive">{errors.nodes.root.message}</p>}
            <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-3 relative bg-muted/50">
                   <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-destructive hover:text-destructive"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <h4 className="font-medium">Node {index + 1}</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <Label htmlFor={`nodes.${index}.title`}>Node Title</Label>
                        <Input {...register(`nodes.${index}.title`)} placeholder="e.g., Mitochondria" />
                        {errors.nodes?.[index]?.title && <p className="text-sm text-destructive">{errors.nodes?.[index]?.title?.message}</p>}
                     </div>
                      <div className="space-y-1">
                        <Label htmlFor={`nodes.${index}.content`}>Node Content</Label>
                        <Textarea {...register(`nodes.${index}.content`)} placeholder="Description of the node" rows={1}/>
                        {errors.nodes?.[index]?.content && <p className="text-sm text-destructive">{errors.nodes?.[index]?.content?.message}</p>}
                     </div>
                      <div className="space-y-1">
                        <Label htmlFor={`nodes.${index}.posX`}>Position X</Label>
                        <Input {...register(`nodes.${index}.posX`)} type="number" placeholder="e.g., 350"/>
                        {errors.nodes?.[index]?.posX && <p className="text-sm text-destructive">{errors.nodes?.[index]?.posX?.message}</p>}
                     </div>
                      <div className="space-y-1">
                        <Label htmlFor={`nodes.${index}.posY`}>Position Y</Label>
                        <Input {...register(`nodes.${index}.posY`)} type="number" placeholder="e.g., 500"/>
                        {errors.nodes?.[index]?.posY && <p className="text-sm text-destructive">{errors.nodes?.[index]?.posY?.message}</p>}
                     </div>
                  </div>
                </div>
              ))}
            </div>
            {fields.length < 10 && (
              <Button type="button" variant="outline" size="sm" onClick={() => append({ title: '', content: '', posX: 0, posY: 0 })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Node
              </Button>
            )}
          </div>

          <Alert variant="default">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Penting: Gambar Latar Peta</AlertTitle>
            <AlertDescription>
              Setelah membuat peta, Anda harus menambahkan gambar latar secara manual bernama <strong>`[identifier]_background.png`</strong> ke folder `public/assets/images/backgrounds`. Posisi X dan Y dihitung dari pojok kiri atas gambar tersebut.
            </AlertDescription>
          </Alert>

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>
                Batal
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Membuat...' : 'Buat Peta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
