
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default function BulkUploadQuestions() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
      setErrorDetails(null); // Reset errors on new file selection
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a JSON file to upload.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setErrorDetails(null);
    
    const reader = new FileReader();
    reader.readAsText(file, 'UTF-8');
    reader.onload = async (evt) => {
        try {
            const jsonContent = evt.target?.result;
            if (typeof jsonContent !== 'string') {
                throw new Error("Failed to read file content.");
            }
            const data = JSON.parse(jsonContent);

            const token = localStorage.getItem('token'); 

            const response = await fetch('/api/questions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                // Construct a detailed error message
                let errorMessage = result.error || 'An unknown error occurred.';
                if (result.details) {
                    // Flatten Zod error details into a readable string
                    const fieldErrors = result.details.fieldErrors;
                    const formErrors = result.details.formErrors;
                    let detailedMessages = formErrors.length > 0 ? `Form Errors: ${formErrors.join(', ')}` : '';
                    if(fieldErrors) {
                       detailedMessages += Object.entries(fieldErrors).map(([key, value]) => `
- Field '${key}': ${value}`).join('');
                    }
                    errorMessage += `

Details:
${detailedMessages}`;
                }
                 setErrorDetails(errorMessage);
                throw new Error("Validation failed");
            }

            toast({
                title: 'Upload Successful!',
                description: result.message || `${result.questions?.length || ''} questions have been added.`,
            });
            setFile(null);
            // Clear file input visually
            const fileInput = document.getElementById('json-file') as HTMLInputElement;
            if(fileInput) fileInput.value = '';

        } catch (error: any) {
            console.error(error);
            // The toast will now show a more generic message, as details are in the alert
            toast({
                title: 'Upload Failed',
                description: 'Please check the details below and correct your file.',
                variant: 'destructive',
            });
        } finally {
            setIsUploading(false);
        }
    };
    reader.onerror = () => {
        const errorMsg = 'Could not read the selected file. It might be corrupted or in use.';
        setErrorDetails(errorMsg);
        toast({
            title: 'File Read Error',
            description: errorMsg,
            variant: 'destructive',
        });
        setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Bulk Upload Questions</CardTitle>
          <CardDescription>
            Upload a JSON file containing an array of questions to add them to the question bank.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="json-file">JSON File</Label>
                <Input id="json-file" type="file" accept=".json,.txt" onChange={handleFileChange} />
            </div>
            {errorDetails && (
                 <Alert variant="destructive">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Validation Error</AlertTitle>
                    <AlertDescription className="whitespace-pre-wrap font-mono text-xs">
                        {errorDetails}
                    </AlertDescription>
                </Alert>
            )}
            <Button type="submit" disabled={!file || isUploading}>
              {isUploading ? 'Uploading...' : 'Upload Questions'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
