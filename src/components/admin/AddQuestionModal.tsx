
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
import { PlusCircle, Trash2 } from 'lucide-react';
import { Textarea } from '../ui/textarea';

const optionSchema = z.object({
  text: z.string().min(1, 'Option text cannot be empty.'),
});

const questionSchema = z.object({
  question_text: z.string().min(5, 'Question text must be at least 5 characters long.'),
  options: z.array(optionSchema).min(2, 'Must have at least 2 options.').max(5, 'Cannot have more than 5 options.'),
  correct_answer: z.string().min(1, 'You must specify the correct answer.'),
});

export type QuestionFormData = z.infer<typeof questionSchema>;

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: QuestionFormData) => void;
}

export function AddQuestionModal({ isOpen, onClose, onSubmit }: AddQuestionModalProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      question_text: '',
      options: [{ text: '' }, { text: '' }],
      correct_answer: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options',
  });

  React.useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add New Question to Bank</DialogTitle>
          <DialogDescription>
            Create a new question that can be used in any quiz.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="question_text">Question Text <span className="text-destructive">*</span></Label>
            <Textarea
              id="question_text"
              placeholder="e.g., What does 'CPU' stand for?"
              {...register('question_text')}
            />
            {errors.question_text && <p className="text-sm text-destructive">{errors.question_text.message}</p>}
          </div>

          <div className="space-y-4">
            <Label>Answer Options <span className="text-destructive">*</span></Label>
            {errors.options?.root && <p className="text-sm text-destructive">{errors.options.root.message}</p>}
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input
                  placeholder={`Option ${index + 1}`}
                  {...register(`options.${index}.text`)}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 2}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {fields.length < 5 && (
              <Button type="button" variant="outline" size="sm" onClick={() => append({ text: '' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Option
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="correct_answer">Correct Answer <span className="text-destructive">*</span></Label>
            <Input
              id="correct_answer"
              placeholder="Type the exact text of the correct option"
              {...register('correct_answer')}
            />
            {errors.correct_answer && <p className="text-sm text-destructive">{errors.correct_answer.message}</p>}
          </div>

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Question'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
