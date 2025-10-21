
'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mic, User, Youtube } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const baseSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters.'),
  url: z.string().url('Please enter a valid YouTube, Vimeo, etc. URL.'),
});

const formSchemaWithAdmin = baseSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters."),
});

type SongFormValues = z.infer<typeof baseSchema>;
type SongFormValuesWithAdmin = z.infer<typeof formSchemaWithAdmin>;

interface SongSubmissionFormProps {
  onSongAdd: (song: SongFormValuesWithAdmin) => void;
  studentName: string;
  showNameInput?: boolean;
}

export function SongSubmissionForm({
  onSongAdd,
  studentName,
  showNameInput = false,
}: SongSubmissionFormProps) {
  const { toast } = useToast();
  
  const finalSchema = showNameInput ? formSchemaWithAdmin : baseSchema;

  const form = useForm<SongFormValuesWithAdmin>({
    resolver: zodResolver(finalSchema),
    defaultValues: {
      name: '',
      title: '',
      url: '',
    },
  });

  function onSubmit(values: SongFormValuesWithAdmin) {
    onSongAdd(values);
    toast({
      title: 'Request Submitted!',
      description: `"${values.title}" has been added to the queue.`,
    });
    form.reset();
  }

  return (
    <Card className="shadow-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Request a Song{showNameInput ? '' : `, ${studentName}`}!</CardTitle>
            <CardDescription>
              Add your favorite karaoke track to the list.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showNameInput && (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="e.g., DJ Jazzy Jeff" {...field} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Song Title</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mic className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="e.g., Bohemian Rhapsody" {...field} className="pl-10" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Karaoke Video Link</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Youtube className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="https://youtube.com/watch?v=..." {...field} className="pl-10" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Add to Queue
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
