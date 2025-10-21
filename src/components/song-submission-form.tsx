
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

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const baseSchema = z.object({
  title: z.string().min(2, 'Başlık en az 2 karakter olmalıdır.'),
  url: z.string().url('Lütfen geçerli bir YouTube, Vimeo vb. URL\'si girin.'),
});

const formSchemaWithAdmin = baseSchema.extend({
  firstName: z.string().min(1, "İsim gerekli").transform(capitalize).optional(),
  lastName: z.string().min(1, "Soyisim gerekli").transform(capitalize).optional(),
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
  
  const finalSchema = showNameInput 
    ? formSchemaWithAdmin.refine(data => data.firstName && data.lastName, {
        message: "İsim ve soyisim gerekli.",
        path: ["lastName"], // Show error on the second field for better UX
      })
    : baseSchema;

  const form = useForm<SongFormValuesWithAdmin>({
    resolver: zodResolver(finalSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      title: '',
      url: '',
    },
  });
  
  React.useEffect(() => {
    if (showNameInput) {
        form.reset({ firstName: '', lastName: '', title: '', url: ''});
    } else {
        form.reset({ title: '', url: ''});
    }
  }, [showNameInput, studentName, form]);

  function onSubmit(values: SongFormValuesWithAdmin) {
    const submissionValues = {
        ...values,
    };
    onSongAdd(submissionValues);
    toast({
      title: 'İstek Gönderildi!',
      description: `"${values.title}" sıraya eklendi.`,
      duration: 3000,
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adınız</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input placeholder="ör., DJ" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Soyadınız</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input placeholder="ör., Bülent" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
