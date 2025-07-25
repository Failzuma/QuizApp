
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Loader2, BookOpen, ImageUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

const optionSchema = z.object({
  text: z.string().min(1, 'Option text cannot be empty.'),
  image: z.any().optional(),
});

const questionFormSchema = z.object({
  question_type: z.enum(['MULTIPLE_CHOICE', 'SHORT_ANSWER', 'IMAGE_MATCH']),
  question_text: z.string().min(10, 'Question text must be at least 10 characters.'),
  question_image: z.any().optional(),
  options: z.array(optionSchema).min(2, 'Must have at least 2 options.').max(5, 'Cannot have more than 5 options.'),
  correct_answer: z.string().min(1, 'You must specify the correct answer.'),
}).refine(data => {
    if (data.question_type === 'MULTIPLE_CHOICE') {
        return data.options.some(opt => opt.text === data.correct_answer);
    }
    return true;
}, {
    message: "The correct answer must exactly match one of the options.",
    path: ["correct_answer"],
});

type QuestionFormData = z.infer<typeof questionFormSchema>;

export default function CreateQuestionPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [questionImagePreview, setQuestionImagePreview] = React.useState<string | null>(null);
  const [optionImagePreviews, setOptionImagePreviews] = React.useState<(string | null)[]>([]);


  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuestionFormData>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      question_type: 'MULTIPLE_CHOICE',
      question_text: '',
      options: [{ text: '' }, { text: '' }],
      correct_answer: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options',
  });
  
  const questionType = watch('question_type');

  const handleCreateQuestion = async (data: QuestionFormData) => {
    setIsSubmitting(true);
    const token = localStorage.getItem('token');
    
    // In a real app, you would upload images to a cloud storage service (e.g., S3, Cloudinary)
    // and get back URLs. For this example, we'll just simulate this.
    const uploadedQuestionImageUrl = data.question_image ? "https://example.com/placeholder.jpg" : null;
    const uploadedOptionImageUrls = data.options.map(opt => opt.image ? "https://example.com/placeholder.jpg" : null);

    const payload = {
      ...data,
      image_url: uploadedQuestionImageUrl,
      options: data.options.map((opt, i) => ({ text: opt.text, image_url: uploadedOptionImageUrls[i] })),
    };


    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'New question has been added to the bank.',
        });
        reset(); 
        setQuestionImagePreview(null);
        setOptionImagePreviews([]);
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
              Create a new question to be stored in the global question bank.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(handleCreateQuestion)} className="space-y-6">
                
                <div className="space-y-2">
                    <Label htmlFor="question_type">Question Type <span className="text-destructive">*</span></Label>
                    <Select onValueChange={(value) => setValue('question_type', value as any)} defaultValue={questionType}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a question type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="MULTIPLE_CHOICE">Multiple Choice</SelectItem>
                            <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
                            <SelectItem value="IMAGE_MATCH">Image Match</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="question_text">Question Text <span className="text-destructive">*</span></Label>
                    <Textarea id="question_text" {...register('question_text')} placeholder="e.g., What is the primary function of a variable in programming?" />
                    {errors.question_text && <p className="text-sm text-destructive">{errors.question_text.message}</p>}
                </div>
                
                {questionType === 'IMAGE_MATCH' && (
                  <div className="space-y-2">
                    <Label htmlFor="question_image">Question Image (Optional)</Label>
                    <Input id="question_image" type="file" {...register('question_image')} accept="image/*" onChange={(e) => {
                        if (e.target.files?.[0]) {
                            setQuestionImagePreview(URL.createObjectURL(e.target.files[0]));
                        }
                    }} />
                    {questionImagePreview && <img src={questionImagePreview} alt="Question preview" className="mt-2 h-32 w-auto rounded-md object-contain border"/>}
                  </div>
                )}
                
                {questionType !== 'SHORT_ANSWER' && (
                  <div className="space-y-4">
                      <Label>Answer Options <span className="text-destructive">*</span></Label>
                      <div className="space-y-2">
                          {fields.map((field, index) => (
                          <div key={field.id} className="flex items-start gap-2">
                              <div className="flex-grow space-y-2">
                                  <Input {...register(`options.${index}.text`)} placeholder={`Option ${index + 1}`} />
                                  {questionType === 'IMAGE_MATCH' && (
                                     <Input type="file" {...register(`options.${index}.image`)} accept="image/*" className="h-9" onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            const newPreviews = [...optionImagePreviews];
                                            newPreviews[index] = URL.createObjectURL(e.target.files[0]);
                                            setOptionImagePreviews(newPreviews);
                                        }
                                     }}/>
                                  )}
                              </div>
                              {optionImagePreviews[index] && (
                                <img src={optionImagePreviews[index]!} alt={`Option ${index+1} preview`} className="h-20 w-20 rounded-md object-contain border" />
                              )}
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
                )}


                <div className="space-y-2">
                    <Label htmlFor="correct_answer">Correct Answer <span className="text-destructive">*</span></Label>
                    <Textarea {...register('correct_answer')} placeholder={
                        questionType === 'MULTIPLE_CHOICE' ? "Type the exact text of the correct option from the list above." : "Type the exact correct answer for the short answer question."
                    } rows={2}/>
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
