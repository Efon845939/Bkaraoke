
'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Mic, Youtube } from 'lucide-react';
import type { Song } from '@/types';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  title: z.string().min(2, 'Başlık en az 2 karakter olmalıdır.'),
  url: z.string().url('Lütfen geçerli bir YouTube, Vimeo vb. URL\'si girin.'),
});

type EditSongFormValues = z.infer<typeof formSchema>;

interface EditSongDialogProps {
  song: Song;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSongUpdate: (songId: string, values: EditSongFormValues) => void;
}

export function EditSongDialog({
  song,
  isOpen,
  onOpenChange,
  onSongUpdate,
}: EditSongDialogProps) {
  const { toast } = useToast();

  const form = useForm<EditSongFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: song.title,
      url: song.karaokeUrl,
    },
  });
  
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        title: song.title,
        url: song.karaokeUrl,
      });
    }
  }, [isOpen, song, form]);

  function onSubmit(values: EditSongFormValues) {
    onSongUpdate(song.id, values);
    toast({
      title: 'Şarkı Güncellendi!',
      description: `"${values.title}" güncellendi.`,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Şarkı İsteğini Düzenle</DialogTitle>
          <DialogDescription>
            Şarkı isteğinizin detaylarını güncelleyin.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
                {form.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Değişiklikleri Kaydet'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
