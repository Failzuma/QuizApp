
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
import { Textarea } from '@/components/ui/textarea'; // Import Textarea
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'; // Import RadioGroup
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert
import { AlertCircle } from 'lucide-react';

// Zod schema for form validation
const quizSchema = z.object({
  mapId: z.string().min(1, 'Map selection is required'),
  nodeId: z.string().min(1, 'Node ID is required'),
  type: z.enum(['Multiple Choice', 'Short Answer', 'Matching']), // Add other types as needed
  question: z.string().min(5, 'Question must be at least 5 characters'),
  // Options are required only for Multiple Choice and Matching
  options: z.array(z.string()).optional(),
  // Correct answer is required for Multiple Choice and Short Answer
  correctAnswer: z.string().optional(),
}).refine(data => {
  // Validation for options based on type
  if (data.type === 'Multiple Choice' || data.type === 'Matching') {
    return data.options && data.options.length >= 2;
  }
  return true;
}, {
  message: 'At least two options are required for Multiple Choice or Matching types',
  path: ['optionsString'], // Check against the textarea input
}).refine(data => {
    // Validation for correct answer based on type
    if (data.type === 'Multiple Choice' || data.type === 'Short Answer') {
        return data.correctAnswer && data.correctAnswer.trim().length > 0;
    }
    return true;
}, {
    message: 'Correct answer is required for Multiple Choice or Short Answer types',
    path: ['correctAnswer'],
});

export type QuizFormData = z.infer<typeof quizSchema>;

interface AddQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: QuizFormData) => void;
  availableMaps: { id: string; title: string }[];
  initialData?: Partial<QuizFormData>; // For editing later
}

export function AddQuizModal({ isOpen, onClose, onSubmit, availableMaps, initialData }: AddQuizModalProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<QuizFormData>({
    resolver: zodResolver(quizSchema),
    defaultValues: initialData || {
      mapId: '',
      nodeId: '',
      type: 'Multiple Choice', // Default type
      question: '',
      options: [],
      correctAnswer: '',
    },
  });

  const selectedType = watch('type');
  const [optionsString, setOptionsString] = React.useState(initialData?.options?.join('\n') || '');

  // Reset form when modal closes or initial data changes
  React.useEffect(() => {
    if (!isOpen) {
      reset(initialData || {
        mapId: '',
        nodeId: '',
        type: 'Multiple Choice',
        question: '',
        options: [],
        correctAnswer: '',
      });
      setOptionsString(initialData?.options?.join('\n') || '');
    } else {
        // If modal opens with initial data, set the optionsString
        setOptionsString(initialData?.options?.join('\n') || '');
    }
  }, [isOpen, initialData, reset]);

  const handleFormSubmit = (data: QuizFormData) => {
    // Process options from textarea for MC/Matching
    let finalOptions: string[] | undefined = undefined;
    if (data.type === 'Multiple Choice' || data.type === 'Matching') {
        finalOptions = optionsString.split('\n').map(opt => opt.trim()).filter(opt => opt.length > 0);
    }
    // For matching, correctAnswer might not apply in the same way, adjust as needed
    const finalCorrectAnswer = data.type === 'Matching' ? 'N/A' : data.correctAnswer;

    onSubmit({ ...data, options: finalOptions, correctAnswer: finalCorrectAnswer });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"> {/* Make modal scrollable */}
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Quiz' : 'Add New Quiz'}</DialogTitle>
          <DialogDescription>
            Fill in the details for the new quiz question.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
          {/* Map Selection */}
          <div className="space-y-2">
            <Label htmlFor="mapId">Associated Map <span className="text-destructive">*</span></Label>
            <Controller
              name="mapId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger id="mapId">
                    <SelectValue placeholder="Select a map" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMaps.map((map) => (
                      <SelectItem key={map.id} value={map.id}>
                        {map.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.mapId && <p className="text-sm text-destructive">{errors.mapId.message}</p>}
          </div>

          {/* Node ID */}
          <div className="space-y-2">
            <Label htmlFor="nodeId">Associated Node ID <span className="text-destructive">*</span></Label>
            <Input
              id="nodeId"
              placeholder="e.g., node_intro, node5"
              {...register('nodeId')}
            />
             {errors.nodeId && <p className="text-sm text-destructive">{errors.nodeId.message}</p>}
          </div>

           {/* Quiz Type */}
           <div className="space-y-2">
             <Label>Quiz Type <span className="text-destructive">*</span></Label>
             <Controller
               name="type"
               control={control}
               render={({ field }) => (
                 <RadioGroup
                   defaultValue={field.value}
                   onValueChange={field.onChange}
                   className="flex space-x-4"
                 >
                   <div className="flex items-center space-x-2">
                     <RadioGroupItem value="Multiple Choice" id="type-mc" />
                     <Label htmlFor="type-mc">Multiple Choice</Label>
                   </div>
                   <div className="flex items-center space-x-2">
                     <RadioGroupItem value="Short Answer" id="type-sa" />
                     <Label htmlFor="type-sa">Short Answer</Label>
                   </div>
                   <div className="flex items-center space-x-2">
                     <RadioGroupItem value="Matching" id="type-match" />
                     <Label htmlFor="type-match">Matching</Label>
                   </div>
                   {/* Add other types here */}
                 </RadioGroup>
               )}
             />
              {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
           </div>

          {/* Question */}
          <div className="space-y-2">
            <Label htmlFor="question">Question <span className="text-destructive">*</span></Label>
            <Textarea
              id="question"
              placeholder="Enter the quiz question"
              {...register('question')}
              rows={3} // Adjust rows as needed
            />
             {errors.question && <p className="text-sm text-destructive">{errors.question.message}</p>}
          </div>

           {/* Options (Conditional) */}
           {(selectedType === 'Multiple Choice' || selectedType === 'Matching') && (
               <div className="space-y-2">
                    <Label htmlFor="optionsString">
                        Options {selectedType === 'Matching' ? '(Format: Term:Definition)' : ''}
                        <span className="text-destructive">*</span>
                        <span className="text-xs text-muted-foreground"> (Enter each option on a new line)</span>
                    </Label>
                   <Textarea
                     id="optionsString"
                     placeholder={
                        selectedType === 'Matching'
                        ? "Term A:Definition for A\nTerm B:Definition for B"
                        : "Option 1\nOption 2\nOption 3\nOption 4"
                     }
                     value={optionsString}
                     onChange={(e) => setOptionsString(e.target.value)}
                     rows={4}
                   />
                   {/* Display error related to the options textarea */}
                   {errors.optionsString && <p className="text-sm text-destructive">{errors.optionsString.message}</p>}
                   {/* Also handle array-level error if Zod refine fails */}
                   {errors.options && !errors.optionsString && <p className="text-sm text-destructive">{errors.options.message}</p>}
               </div>
           )}

           {/* Correct Answer (Conditional) */}
           {(selectedType === 'Multiple Choice' || selectedType === 'Short Answer') && (
             <div className="space-y-2">
               <Label htmlFor="correctAnswer">
                 Correct Answer <span className="text-destructive">*</span>
                 {selectedType === 'Multiple Choice' && <span className="text-xs text-muted-foreground"> (Must exactly match one of the options)</span>}
               </Label>
               <Input
                 id="correctAnswer"
                 placeholder={selectedType === 'Multiple Choice' ? "Enter the correct option text" : "Enter the correct short answer"}
                 {...register('correctAnswer')}
               />
               {errors.correctAnswer && <p className="text-sm text-destructive">{errors.correctAnswer.message}</p>}
             </div>
           )}

           {/* Matching Type Instructions */}
           {selectedType === 'Matching' && (
                <Alert variant="default">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Matching Quiz Note</AlertTitle>
                    <AlertDescription>
                        Ensure options are in the format "Term:Definition". The system will handle shuffling and matching UI during the quiz. A specific 'Correct Answer' field is not needed here.
                    </AlertDescription>
                </Alert>
           )}


           {/* Display generic form errors if any */}
            {Object.keys(errors).length > 0 && (
                <p className="text-sm text-destructive text-center">Please correct the errors above.</p>
            )}

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">
              {initialData ? 'Update Quiz' : 'Add Quiz'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
