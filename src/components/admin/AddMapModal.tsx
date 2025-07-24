
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
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
import { AlertCircle } from 'lucide-react';

// Zod schema for form validation
const mapSchema = z.object({
  title: z.string().min(3, 'Map title must be at least 3 characters'),
  mapIdentifier: z.string()
    .min(3, 'Identifier must be at least 3 characters')
    .regex(/^[a-z0-9_]+$/, 'Identifier can only contain lowercase letters, numbers, and underscores.'),
});

export type MapFormData = z.infer<typeof mapSchema>;

interface AddMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MapFormData) => void;
}

export function AddMapModal({ isOpen, onClose, onSubmit }: AddMapModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MapFormData>({
    resolver: zodResolver(mapSchema),
  });

  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Map Blueprint</DialogTitle>
          <DialogDescription>
            Create a new map by providing a title and a unique identifier.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Map Title <span className="text-destructive">*</span></Label>
            <Input
              id="title"
              placeholder="e.g., English Grammar Basics"
              {...register('title')}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mapIdentifier">Map Identifier <span className="text-destructive">*</span></Label>
            <Input
              id="mapIdentifier"
              placeholder="e.g., english_grammar_1"
              {...register('mapIdentifier')}
            />
            {errors.mapIdentifier && <p className="text-sm text-destructive">{errors.mapIdentifier.message}</p>}
          </div>
          
          <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important Note</AlertTitle>
              <AlertDescription>
                After creating the map, you must manually add a background image named <strong>`[identifier]_background.png`</strong> to the `public/assets/images/backgrounds` folder.
              </AlertDescription>
          </Alert>


          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Map'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
