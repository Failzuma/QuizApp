
'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


// Schema for creating a new QUIZ INSTANCE, not a question.
const createQuizSchema = z.object({
  title: z.string().min(3, 'Quiz title must be at least 3 characters.'),
  mapId: z.string().min(1, 'You must select a map blueprint.'),
});

export type QuizFormData = z.infer<typeof createQuizSchema>;

interface AddQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: QuizFormData) => void;
  availableMaps: { id: string; title: string }[];
}

export function AddQuizModal({ isOpen, onClose, onSubmit, availableMaps }: AddQuizModalProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuizFormData>({
    resolver: zodResolver(createQuizSchema),
    defaultValues: {
      title: '',
      mapId: '',
    },
  });

  React.useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Playable Quiz</DialogTitle>
          <DialogDescription>
            Give your quiz a title and choose which map blueprint it will use.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Quiz Title <span className="text-destructive">*</span></Label>
            <Input
              id="title"
              placeholder="e.g., Latihan Bab 1: Tenses"
              {...register('title')}
              disabled={isSubmitting}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mapId">Map Blueprint <span className="text-destructive">*</span></Label>
            <Controller
              name="mapId"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="mapId">
                    <SelectValue placeholder="Select a map blueprint..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMaps.length > 0 ? (
                      availableMaps.map((map) => (
                        <SelectItem key={map.id} value={map.id}>
                          {map.title} ({map.id})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No maps available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.mapId && <p className="text-sm text-destructive">{errors.mapId.message}</p>}
          </div>

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Quiz'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
