
'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Loader2, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';

const optionSchema = z.object({
  text: z.string().min(1, 'Option text cannot be empty.'),
});

const questionFormSchema = z.object({
  question_text: z.string().min(10, 'Question text must be at least 10 characters.'),
  options: z.array(optionSchema).min(2, 'Must have at least 2 options.').max(5, 'Cannot have more than 5 options.'),
  correct_answer: z.string().min(1, 'You must specify the correct answer.'),
}).refine(data => data.options.some(opt => opt.text === data.correct_answer), {
    message: "The correct answer must exactly match one of the options.",
    path: ["correct_answer"],
});

type QuestionFormData = z.infer<typeof questionFormSchema>;

export default function CreateQuestionPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<QuestionFormData>({
    resolver: zodResolver(questionFormSchema),
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
  
  const optionsWatch = watch('options');

  const handleCreateQuestion = async (data: QuestionFormData) => {
    setIsSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'New question has been added to the bank.',
        });
        reset(); // Reset form for the next entry
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create question.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Network Error',
        description: 'Could not connect to the server.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
        router.push('/login');
    }
    // Optionally, verify admin role here
  }, [router]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-primary">Create New Question</h1>
        
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Question Details</CardTitle>
            <CardDescription>
              Create a new question to be stored in the global question bank. This question can then be assigned to any node in any quiz.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(handleCreateQuestion)} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="question_text">Question Text <span className="text-destructive">*</span></Label>
                    <Textarea id="question_text" {...register('question_text')} placeholder="e.g., What is the primary function of a variable in programming?" />
                    {errors.question_text && <p className="text-sm text-destructive">{errors.question_text.message}</p>}
                </div>

                <div className="space-y-4">
                    <Label>Answer Options <span className="text-destructive">*</span></Label>
                    <div className="space-y-2">
                        {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2">
                            <Input {...register(`options.${index}.text`)} placeholder={`Option ${index + 1}`} />
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 2}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                        ))}
                    </div>
                     {errors.options?.root && <p className="text-sm text-destructive">{errors.options.root.message}</p>}
                     {errors.options?.message && <p className="text-sm text-destructive">{errors.options.message}</p>}
                    {fields.length < 5 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ text: '' })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                    </Button>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="correct_answer">Correct Answer <span className="text-destructive">*</span></Label>
                    <Textarea {...register('correct_answer')} placeholder="Type the exact text of the correct option from the list above." rows={2}/>
                    {errors.correct_answer && <p className="text-sm text-destructive">{errors.correct_answer.message}</p>}
                </div>

                <div className="flex justify-end pt-4">
                     <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <BookOpen className="mr-2"/>}
                        Save to Question Bank
                     </Button>
                </div>

            </form>
          </CardContent>
        </Card>

      </main>
      <Footer />
    </div>
  );
}
