
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

const capitalize = (s: string) => s.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');

const formSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalıdır.").transform(capitalize),
  title: z.string().min(2, 'Başlık en az 2 karakter olmalıdır.'),
  url: z.string().url('Lütfen geçerli bir YouTube, Vimeo vb. URL\'si girin.'),
});

type SongFormValues = z.infer<typeof formSchema>;

interface SongSubmissionFormProps {
  onSongAdd: (song: SongFormValues) => void;
  showNameInput?: boolean;
}

export function SongSubmissionForm({
  onSongAdd,
  showNameInput = false,
}: SongSubmissionFormProps) {
  
  const form = useForm<SongFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      title: '',
      url: '',
    },
  });

  function onSubmit(values: SongFormValues) {
    onSongAdd(values);
    form.reset();
  }

  return (
    <Card className="shadow-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Bir Şarkı İste!</CardTitle>
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
                    <FormLabel>Adınız ve Soyadınız</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="ör., DJ Bülent" {...field} className="pl-10" />
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
                      <Input placeholder="ör., Tarkan - Şıkıdım" {...field} className="pl-10" />
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
