
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
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Puzzle, ListOrdered, MousePointerClick, Shuffle, Move } from 'lucide-react'; // Added icons

// Define all supported quiz types
const QuizTypes = [
    'Multiple Choice',
    'Short Answer',
    'Matching',
    'Sequencing',
    'Drag & Drop', // Can represent Labeling or Grouping
    'Hotspot',
    'Scramble' // Word or Sentence
] as const; // Use const assertion for literal types

// Zod schema for form validation, incorporating new types
const quizSchema = z.object({
  mapId: z.string().min(1, 'Map selection is required'),
  nodeId: z.string().min(1, 'Node ID is required'),
  type: z.enum(QuizTypes),
  question: z.string().min(5, 'Question/Instruction must be at least 5 characters'),
  // Options are required for Multiple Choice, Matching, Sequencing, Drag & Drop (Labels/Items)
  options: z.array(z.string()).optional(),
  // Correct answer is required for Multiple Choice, Short Answer, Scramble. Optional/structured differently for others.
  correctAnswer: z.string().optional(),
  // Keep optionsString for textarea input validation, but link it to 'options' logic
  optionsString: z.string().optional(),
}).refine(data => {
  // Validation for options based on type
  if (['Multiple Choice', 'Matching', 'Sequencing', 'Drag & Drop'].includes(data.type)) {
    // Split optionsString and check length
    const numOptions = data.optionsString?.split('\n').map(opt => opt.trim()).filter(opt => opt.length > 0).length ?? 0;
    if (data.type === 'Multiple Choice' || data.type === 'Matching' || data.type === 'Sequencing') {
      return numOptions >= 2;
    }
    if (data.type === 'Drag & Drop') {
      // Needs at least one label/item to drag
      return numOptions >= 1;
    }
  }
  return true;
}, {
  message: 'At least two options are required for Multiple Choice, Matching, or Sequencing. At least one for Drag & Drop.',
  path: ['optionsString'], // Validate the raw textarea input
}).refine(data => {
    // Validation for correct answer based on type
    if (['Multiple Choice', 'Short Answer', 'Scramble'].includes(data.type)) {
        return data.correctAnswer && data.correctAnswer.trim().length > 0;
    }
    // For Sequencing, correct answer might represent the order
    if (data.type === 'Sequencing') {
        // For now, make it optional or define a specific format like comma-separated indices later
        return true; // Let's make it optional for now
    }
    // Matching, Drag&Drop, Hotspot don't use a single string correctAnswer in the same way
    return true;
}, {
    message: 'Correct answer is required for Multiple Choice, Short Answer, or Scramble types.',
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
    setValue, // Need setValue to update options array based on optionsString
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
      optionsString: '',
    },
  });

  const selectedType = watch('type');
  // Use state for optionsString to control the textarea directly
  const [optionsString, setOptionsString] = React.useState(initialData?.options?.join('\n') || '');

   // Update the optionsString state when initialData changes (for editing)
   React.useEffect(() => {
       setOptionsString(initialData?.options?.join('\n') || '');
       // Also reset the form with potentially new initialData
       reset(initialData || {
          mapId: '',
          nodeId: '',
          type: 'Multiple Choice',
          question: '',
          options: [],
          correctAnswer: '',
          optionsString: initialData?.options?.join('\n') || '', // Ensure optionsString is in sync
       });
   }, [initialData, reset]);


   // Effect to synchronise optionsString state with RHF value for validation
    React.useEffect(() => {
        setValue('optionsString', optionsString, { shouldValidate: true });
    }, [optionsString, setValue]);


  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      // Reset to initialData if editing, otherwise to defaults
      const defaultValues = initialData || {
        mapId: '',
        nodeId: '',
        type: 'Multiple Choice',
        question: '',
        options: [],
        correctAnswer: '',
        optionsString: '',
      };
      reset(defaultValues);
      // Also reset the local state for the textarea
      setOptionsString(defaultValues.options?.join('\n') || '');
    }
  }, [isOpen, initialData, reset]);


  const handleFormSubmit = (data: QuizFormData) => {
    // Process options from textarea based on type
    let finalOptions: string[] | undefined = undefined;
    if (['Multiple Choice', 'Matching', 'Sequencing', 'Drag & Drop'].includes(data.type)) {
        finalOptions = optionsString.split('\n').map(opt => opt.trim()).filter(opt => opt.length > 0);
    }

    // Adjust correctAnswer based on type where applicable
    let finalCorrectAnswer = data.correctAnswer;
    if (['Matching', 'Hotspot', 'Drag & Drop'].includes(data.type)) {
        // These types don't use a simple string answer in the same way
        finalCorrectAnswer = 'N/A'; // Indicate complex answer structure handled elsewhere
    }
     // For Sequencing, the 'correctAnswer' field might store the ordered list or indices
     // For now, we pass it as is, or could set to 'N/A' if order is derived from options

    onSubmit({ ...data, options: finalOptions, correctAnswer: finalCorrectAnswer });
  };

  // Helper to render icons for quiz types
    const getIconForType = (type: typeof QuizTypes[number]) => {
        switch (type) {
            case 'Multiple Choice': return <Puzzle className="h-4 w-4 mr-2" />;
            case 'Short Answer': return <Input className="h-4 w-4 mr-2 border-none p-0" style={{ display: 'inline-block', verticalAlign: 'middle' }} />; // Placeholder icon
            case 'Matching': return <Puzzle className="h-4 w-4 mr-2" />;
            case 'Sequencing': return <ListOrdered className="h-4 w-4 mr-2" />;
            case 'Drag & Drop': return <Move className="h-4 w-4 mr-2" />;
            case 'Hotspot': return <MousePointerClick className="h-4 w-4 mr-2" />;
            case 'Scramble': return <Shuffle className="h-4 w-4 mr-2" />;
            default: return null;
        }
    };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"> {/* Make modal scrollable */}
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Quiz' : 'Add New Quiz'}</DialogTitle>
          <DialogDescription>
            Fill in the details for the new quiz question. Select the type and provide necessary information.
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
                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
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
              placeholder="e.g., node_intro, node5 (use numeric ID for now)"
              {...register('nodeId')}
            />
             {errors.nodeId && <p className="text-sm text-destructive">{errors.nodeId.message}</p>}
          </div>

           {/* Quiz Type Selection using RadioGroup */}
           <div className="space-y-2">
             <Label>Quiz Type <span className="text-destructive">*</span></Label>
             <Controller
               name="type"
               control={control}
               render={({ field }) => (
                 <RadioGroup
                   value={field.value} // Controlled component
                   onValueChange={field.onChange}
                   className="grid grid-cols-2 gap-x-4 gap-y-2" // Use grid for better layout
                 >
                   {QuizTypes.map((type) => (
                     <div key={type} className="flex items-center space-x-2">
                       <RadioGroupItem value={type} id={`type-${type.replace(/\s+/g, '-')}`} />
                       <Label htmlFor={`type-${type.replace(/\s+/g, '-')}`} className="flex items-center cursor-pointer">
                         {getIconForType(type)}
                         {type}
                       </Label>
                     </div>
                   ))}
                 </RadioGroup>
               )}
             />
             {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
           </div>


          {/* Question / Instruction */}
          <div className="space-y-2">
            <Label htmlFor="question">
              {selectedType === 'Scramble' ? 'Scrambled Word/Sentence' : 'Question / Instruction'}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="question"
              placeholder={
                selectedType === 'Scramble' ? 'Enter the letters/words to be unscrambled' :
                selectedType === 'Hotspot' ? 'Enter the instruction (e.g., Click on the mitochondria)' :
                'Enter the quiz question or instruction'
                }
              {...register('question')}
              rows={selectedType === 'Scramble' ? 2 : 3} // Adjust rows
            />
             {errors.question && <p className="text-sm text-destructive">{errors.question.message}</p>}
          </div>

           {/* Options (Conditional based on type) */}
           {['Multiple Choice', 'Matching', 'Sequencing', 'Drag & Drop'].includes(selectedType) && (
               <div className="space-y-2">
                    <Label htmlFor="optionsString">
                        Options / Items
                        {selectedType === 'Matching' && <span className="text-xs text-muted-foreground"> (Format: Term:Definition)</span>}
                        {selectedType === 'Sequencing' && <span className="text-xs text-muted-foreground"> (Enter items in CORRECT order)</span>}
                        {selectedType === 'Drag & Drop' && <span className="text-xs text-muted-foreground"> (Enter draggable labels/items)</span>}
                        <span className="text-destructive">*</span>
                        <span className="text-xs text-muted-foreground"> (Enter each on a new line)</span>
                    </Label>
                   <Textarea
                     id="optionsString"
                     placeholder={
                        selectedType === 'Matching' ? "Term A:Definition for A\nTerm B:Definition for B" :
                        selectedType === 'Sequencing' ? "Step 1\nStep 2\nStep 3" :
                        selectedType === 'Drag & Drop' ? "Label 1\nLabel 2\nGroup Item A" :
                        "Option 1\nOption 2\nOption 3\nOption 4"
                     }
                     value={optionsString}
                     onChange={(e) => setOptionsString(e.target.value)}
                     rows={4}
                   />
                   {/* Display validation error for optionsString */}
                   {errors.optionsString && <p className="text-sm text-destructive">{errors.optionsString.message}</p>}
                   {/* Fallback error display if refine fails at root level (less likely with path specified) */}
                   {errors.options && !errors.optionsString && <p className="text-sm text-destructive">{errors.options.message}</p>}
               </div>
           )}

           {/* Correct Answer (Conditional based on type) */}
           {['Multiple Choice', 'Short Answer', 'Scramble'].includes(selectedType) && (
             <div className="space-y-2">
               <Label htmlFor="correctAnswer">
                 Correct Answer <span className="text-destructive">*</span>
                 {selectedType === 'Multiple Choice' && <span className="text-xs text-muted-foreground"> (Must exactly match one option)</span>}
                 {selectedType === 'Scramble' && <span className="text-xs text-muted-foreground"> (The unscrambled word/sentence)</span>}
               </Label>
               <Input
                 id="correctAnswer"
                 placeholder={
                    selectedType === 'Multiple Choice' ? "Enter the correct option text" :
                    selectedType === 'Scramble' ? "Enter the correct word/sentence" :
                    "Enter the correct short answer"
                    }
                 {...register('correctAnswer')}
               />
               {errors.correctAnswer && <p className="text-sm text-destructive">{errors.correctAnswer.message}</p>}
             </div>
           )}

          {/* Informational Alerts for specific types */}
           {selectedType === 'Matching' && (
                <Alert variant="default">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Matching Quiz Note</AlertTitle>
                    <AlertDescription>
                        Ensure options are "Term:Definition". The game UI will handle shuffling and matching. No separate 'Correct Answer' field needed here.
                    </AlertDescription>
                </Alert>
           )}
            {selectedType === 'Sequencing' && (
                <Alert variant="default">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Sequencing Quiz Note</AlertTitle>
                    <AlertDescription>
                        Enter the sequence items in the CORRECT order in the 'Options' field. The game UI will handle shuffling. No separate 'Correct Answer' field needed here.
                    </AlertDescription>
                </Alert>
           )}
            {selectedType === 'Drag & Drop' && (
                <Alert variant="default">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Drag & Drop Quiz Note</AlertTitle>
                    <AlertDescription>
                        Enter the draggable items/labels in the 'Options' field. For labeling tasks, you'll typically need to associate these with target areas in the game setup (not handled in this form). For grouping, provide category names or define them elsewhere.
                    </AlertDescription>
                </Alert>
           )}
           {selectedType === 'Hotspot' && (
                <Alert variant="default">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Hotspot Quiz Note</AlertTitle>
                    <AlertDescription>
                        Provide the instruction in the 'Question' field. The actual hotspot coordinates/areas need to be defined within the game scene/map editor, linked to this question's ID. No 'Options' or 'Correct Answer' needed here.
                    </AlertDescription>
                </Alert>
           )}


           {/* Display generic form errors if any */}
            {Object.keys(errors).length > 0 && (
                 // Check if the error is *not* just optionsString when options are not required
                 (errors.optionsString && ['Multiple Choice', 'Matching', 'Sequencing', 'Drag & Drop'].includes(selectedType) ||
                 Object.keys(errors).some(key => key !== 'optionsString')) &&
                 <p className="text-sm text-destructive text-center">Please correct the errors above.</p>
            )}

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose}> {/* Ensure Cancel explicitly calls onClose */}
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

    