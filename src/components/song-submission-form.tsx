
'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mic, User, Youtube } from 'lucide-react';
import * as React from 'react';

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
  title: z.string().min(2, 'Başlık en az 2 karakter olmalıdır.'),
  url: z.string().url('Lütfen geçerli bir YouTube, Vimeo vb. URL\'si girin.'),
});

const formSchemaWithAdmin = baseSchema.extend({
  name: z.string().min(2, "İsim en az 2 karakter olmalıdır.").optional(),
});

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
  
  const finalSchema = showNameInput ? formSchemaWithAdmin.refine(data => !showNameInput || (data.name && data.name.length >= 2), {
    message: "İsim en az 2 karakter olmalıdır.",
    path: ["name"],
  }) : baseSchema;

  const form = useForm<SongFormValuesWithAdmin>({
    resolver: zodResolver(finalSchema),
    defaultValues: {
      name:  '',
      title: '',
      url: '',
    },
  });
  
  React.useEffect(() => {
    if (showNameInput) {
        form.reset({ name: '', title: '', url: ''});
    } else {
        form.reset({ name: studentName, title: '', url: ''});
    }
  }, [showNameInput, studentName, form]);

  function onSubmit(values: SongFormValuesWithAdmin) {
    const submissionValues = {
        ...values,
        name: showNameInput ? values.name : studentName,
    };
    onSongAdd(submissionValues);
    toast({
      title: 'İstek Gönderildi!',
      description: `"${values.title}" sıraya eklendi.`,
    });
    form.reset();
  }

  return (
    <Card className="shadow-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Bir Şarkı İste{showNameInput ? '' : `, ${studentName}`}!</CardTitle>
            <CardDescription>
              Favori karaoke parçanızı listeye ekleyin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showNameInput && (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adınız</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="ör., DJ Jazzy Jeff" {...field} className="pl-10" />
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
                  <FormLabel>Şarkı Başlığı</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mic className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="ör., Bohemian Rhapsody" {...field} className="pl-10" />
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
                  <FormLabel>Karaoke Video Bağlantısı</FormLabel>
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
              Sıraya Ekle
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
