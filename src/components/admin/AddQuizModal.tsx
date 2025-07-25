
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
import { Textarea } from '../ui/textarea';
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

// ---- Zod Schemas ----

const optionSchema = z.object({
  text: z.string().min(1, 'Option text cannot be empty.'),
});

const questionSchema = z.object({
  question_text: z.string().min(5, 'Question text must be at least 5 characters long.'),
  options: z.array(optionSchema).min(2, 'Must have at least 2 options.').max(5, 'Cannot have more than 5 options.'),
  correct_answer: z.string().min(1, 'You must specify the correct answer.'),
});

const quizWithQuestionsSchema = z.object({
  title: z.string().min(3, 'Quiz title must be at least 3 characters.'),
  mapId: z.string().min(1, 'You must select a map blueprint.'),
  questions: z.array(questionSchema),
});

export type QuizWithQuestionsFormData = z.infer<typeof quizWithQuestionsSchema>;

// ---- Component Props ----

interface AddQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: QuizWithQuestionsFormData) => Promise<void>;
  availableMaps: { id: string; title: string; nodes: number }[];
}

// ---- Main Component ----

export function AddQuizModal({ isOpen, onClose, onSubmit, availableMaps }: AddQuizModalProps) {
  const [step, setStep] = React.useState(1);
  const [selectedMapNodeCount, setSelectedMapNodeCount] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    trigger,
    formState: { errors },
  } = useForm<QuizWithQuestionsFormData>({
    resolver: zodResolver(quizWithQuestionsSchema),
    defaultValues: {
      title: '',
      mapId: '',
      questions: [],
    },
    context: {
        isSubmitting: true // Pass isSubmitting to context
    }
  });
  
  const { fields, replace } = useFieldArray({
    control,
    name: 'questions',
  });
  
  const watchedMapId = watch('mapId');
  const watchedTitle = watch('title');

  // Effect to update the number of question forms when a map is selected
  React.useEffect(() => {
    const selectedMap = availableMaps.find(m => m.id === watchedMapId);
    const nodeCount = selectedMap?.nodes || 0;
    setSelectedMapNodeCount(nodeCount);

    const currentQuestions = watch('questions');
    if (currentQuestions.length !== nodeCount) {
        const newQuestions = Array(nodeCount).fill(0).map(() => ({
            question_text: '',
            options: [{ text: '' }, { text: '' }],
            correct_answer: ''
        }));
        replace(newQuestions);
    }
  }, [watchedMapId, availableMaps, replace, watch]);


  // Effect to reset form when modal closes
  const handleClose = () => {
    reset({
        title: '',
        mapId: '',
        questions: []
    });
    setStep(1);
    setSelectedMapNodeCount(0);
    setIsSubmitting(false);
    onClose();
  };
  
  const handleNextStep = async () => {
      const isValid = await trigger(["title", "mapId"]);
      if (isValid) {
          if (selectedMapNodeCount > 0) {
              setStep(2);
          }
      }
  };

  const handleBackStep = () => setStep(1);

  const processSubmit = async (data: QuizWithQuestionsFormData) => {
    // Validate correct answers
    let allCorrectAnswersValid = true;
    data.questions.forEach((q, index) => {
        const correctText = q.correct_answer;
        const hasOption = q.options.some(opt => opt.text === correctText && correctText !== '');
        if (!hasOption) {
            // This is a manual way to set an error. A more robust solution might involve custom validation rules in Zod.
            console.error(`Validation failed for question ${index + 1}: Correct answer does not match any option.`);
            allCorrectAnswersValid = false;
        }
    });

    if (!allCorrectAnswersValid) {
         alert("One or more 'Correct Answer' fields do not match any of the provided options, or are empty. Please review your questions.");
         return;
    }

    setIsSubmitting(true);
    await onSubmit(data);
    setIsSubmitting(false); // Re-enable button if submit fails
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <form onSubmit={handleSubmit(processSubmit)}>
            <ScrollArea className="max-h-[80vh] px-2">
                <div className="pr-4">
                    <DialogHeader>
                        <DialogTitle>{step === 1 ? 'Create New Quiz (Step 1 of 2)' : `Add Questions for "${watchedTitle}" (Step 2 of 2)`}</DialogTitle>
                        <DialogDescription>
                            {step === 1 ? 'Give your quiz a title and choose which map blueprint it will use.' : `This map has ${selectedMapNodeCount} node(s). Please create a question for each node.`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-6">
                        {/* --- Step 1: Quiz Details --- */}
                        <div className={step === 1 ? 'block' : 'hidden'}>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Quiz Title <span className="text-destructive">*</span></Label>
                                    <Input id="title" placeholder="e.g., Latihan Bab 1: Tenses" {...register('title')} />
                                    {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="mapId">Map Blueprint <span className="text-destructive">*</span></Label>
                                    <Controller name="mapId" control={control} render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger id="mapId"><SelectValue placeholder="Select a map blueprint..." /></SelectTrigger>
                                        <SelectContent>
                                            {availableMaps.map(map => (
                                            <SelectItem key={map.id} value={map.id}>
                                                {map.title} ({map.nodes} node{map.nodes !== 1 ? 's' : ''})
                                            </SelectItem>
                                            ))}
                                        </SelectContent>
                                        </Select>
                                    )}/>
                                    {errors.mapId && <p className="text-sm text-destructive">{errors.mapId.message}</p>}
                                    {watchedMapId && selectedMapNodeCount === 0 && (
                                        <Alert variant="destructive" className="mt-2">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertTitle>Cannot use this map</AlertTitle>
                                            <AlertDescription className="text-xs">
                                                This map has no nodes and cannot be used for a quiz. Please edit the map to add nodes.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* --- Step 2: Add Questions --- */}
                        <div className={step === 2 ? 'block' : 'hidden'}>
                             {errors.questions?.root && <p className="text-sm text-destructive mb-2">{errors.questions.root.message}</p>}
                            <div className="space-y-4">
                                {fields.map((field, index) => {
                                    const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
                                        control,
                                        name: `questions.${index}.options`
                                    });

                                    return (
                                        <div key={field.id} className="p-4 border rounded-lg space-y-3 bg-muted/50">
                                            <h4 className="font-semibold text-primary">Question for Node {index + 1}</h4>
                                            
                                            <div className="space-y-2">
                                                <Label htmlFor={`questions.${index}.question_text`}>Question Text <span className="text-destructive">*</span></Label>
                                                <Textarea {...register(`questions.${index}.question_text`)} placeholder="e.g., What is the capital of France?" />
                                                {errors.questions?.[index]?.question_text && <p className="text-sm text-destructive">{errors.questions?.[index]?.question_text?.message}</p>}
                                            </div>

                                            <div className="space-y-3">
                                                <Label>Answer Options <span className="text-destructive">*</span></Label>
                                                <div className="space-y-2">
                                                    {optionFields.map((optField, optIndex) => (
                                                    <div key={optField.id} className="flex items-center gap-2">
                                                        <Input {...register(`questions.${index}.options.${optIndex}.text`)} placeholder={`Option ${optIndex + 1}`} />
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(optIndex)} disabled={optionFields.length <= 2}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                    ))}
                                                    {errors.questions?.[index]?.options?.root && <p className="text-xs text-destructive">{errors.questions?.[index]?.options?.root?.message}</p>}
                                                    {errors.questions?.[index]?.options?.[0] && <p className="text-xs text-destructive">An option is required</p>}
                                                </div>
                                                {optionFields.length < 5 && (
                                                <Button type="button" variant="outline" size="sm" onClick={() => appendOption({ text: '' })}>
                                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                                                </Button>
                                                )}
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <Label htmlFor={`questions.${index}.correct_answer`}>Correct Answer <span className="text-destructive">*</span></Label>
                                                <Input {...register(`questions.${index}.correct_answer`)} placeholder="Type the exact text of the correct option" />
                                                {errors.questions?.[index]?.correct_answer && <p className="text-sm text-destructive">{errors.questions?.[index]?.correct_answer?.message}</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                </div>
            </ScrollArea>
            <DialogFooter className="pt-4 sticky bottom-0 bg-background py-4 px-6 border-t -mx-2 -mb-6">
                {step === 1 && (
                    <>
                        <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                        <Button type="button" onClick={handleNextStep} disabled={!watchedMapId || !watchedTitle || selectedMapNodeCount === 0}>
                            Next <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </>
                )}
                {step === 2 && (
                    <>
                        <Button type="button" variant="outline" onClick={handleBackStep} disabled={isSubmitting}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Create Quiz'}
                        </Button>
                    </>
                )}
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    