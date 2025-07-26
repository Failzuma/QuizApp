
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function BulkUploadQuestions() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
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
    const reader = new FileReader();
    reader.readAsText(file, 'UTF-8');
    reader.onload = async (evt) => {
        try {
            const jsonContent = evt.target?.result;
            if (typeof jsonContent !== 'string') {
                throw new Error("Failed to read file content.");
            }
            const data = JSON.parse(jsonContent);

            // Here you would typically get the token from your auth context
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
                throw new Error(result.error || 'Something went wrong');
            }

            toast({
                title: 'Upload Successful',
                description: result.message || 'Questions have been added to the bank.',
            });
            setFile(null); // Reset file input
        } catch (error: any) {
            console.error(error);
            toast({
                title: 'Upload Failed',
                description: error.message || 'Please check the file format and try again.',
                variant: 'destructive',
            });
        } finally {
            setIsUploading(false);
        }
    };
    reader.onerror = () => {
        toast({
            title: 'File Read Error',
            description: 'Could not read the selected file.',
            variant: 'destructive',
        });
        setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-lg mx-auto">
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
                <Input id="json-file" type="file" accept=".json" onChange={handleFileChange} />
            </div>
            <Button type="submit" disabled={!file || isUploading}>
              {isUploading ? 'Uploading...' : 'Upload Questions'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
