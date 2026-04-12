"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Sparkles, LoaderCircle, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getAiSuggestions } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import type { AICaptionAndHashtagSuggestionsOutput } from "@/ai/flows/ai-caption-hashtag-suggestions";

const createPostSchema = z.object({
  image: z.any().refine((files) => files?.length === 1, "Image is required."),
  caption: z.string().max(2200, "Caption is too long."),
});

type CreatePostFormValues = z.infer<typeof createPostSchema>;

export function CreatePostForm() {
  const [preview, setPreview] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AICaptionAndHashtagSuggestionsOutput | null>(null);
  const [isAiLoading, startAiTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<CreatePostFormValues>({
    resolver: zodResolver(createPostSchema),
    defaultValues: { caption: "" },
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGetAiSuggestions = () => {
    const caption = form.getValues("caption");
    if (!preview && !caption) {
      toast({
        title: "Provide content",
        description: "Please add an image or a description first.",
        variant: "destructive",
      });
      return;
    }
    
    startAiTransition(async () => {
      try {
        const suggestions = await getAiSuggestions({
          postDescription: caption,
          imageDataUri: preview || undefined,
        });
        setAiSuggestions(suggestions);
      } catch (error) {
        toast({
          title: "AI Suggestion Failed",
          description: "Could not generate suggestions. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  const handleUseSuggestion = (suggestion: string, type: 'caption' | 'hashtag') => {
    if (type === 'caption') {
      form.setValue('caption', suggestion);
    } else {
      const currentCaption = form.getValues('caption');
      form.setValue('caption', `${currentCaption} ${suggestion}`.trim());
    }
    toast({
      title: "Added to caption",
      description: `Copied suggestion to your caption.`,
      action: <Check className="h-5 w-5 text-green-500" />,
      duration: 2000,
    });
  };

  function onSubmit(data: CreatePostFormValues) {
    console.log(data);
    toast({
      title: "Post Submitted!",
      description: "Your post is now live for 48 hours.",
    });
    // Here you would typically handle form submission to your backend
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image</FormLabel>
              <Card>
                <CardContent className="p-2">
                  {preview ? (
                    <div className="relative aspect-square w-full">
                      <Image src={preview} alt="Image preview" fill className="rounded-md object-cover" />
                    </div>
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center rounded-md border-2 border-dashed">
                      <p className="text-muted-foreground">Image Preview</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              <FormControl>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    field.onChange(e.target.files);
                    handleImageChange(e);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="caption"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Caption</FormLabel>
              <FormControl>
                <Textarea placeholder="Write a caption..." {...field} rows={4} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="font-semibold">AI Assistant</h3>
                    <p className="text-sm text-muted-foreground">Generate captions & hashtags.</p>
                </div>
                <Button type="button" onClick={handleGetAiSuggestions} disabled={isAiLoading} size="sm" className="bg-accent hover:bg-accent/90">
                    {isAiLoading ? (
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Suggest
                </Button>
            </div>

            {isAiLoading && <div className="flex justify-center items-center p-4"><LoaderCircle className="h-6 w-6 animate-spin text-primary"/></div>}

            {aiSuggestions && (
            <div className="space-y-4 pt-4 border-t">
                <div>
                    <h4 className="font-medium text-sm mb-2">Caption Suggestions</h4>
                    <div className="space-y-2">
                        {aiSuggestions.captionSuggestions.map((s, i) => (
                            <div key={i} onClick={() => handleUseSuggestion(s, 'caption')} className="text-sm p-2 rounded-md bg-muted hover:bg-secondary cursor-pointer transition-colors">
                                {s}
                            </div>
                        ))}
                    </div>
                </div>
                 <div>
                    <h4 className="font-medium text-sm mb-2">Hashtag Suggestions</h4>
                    <div className="flex flex-wrap gap-2">
                        {aiSuggestions.hashtagSuggestions.map((h, i) => (
                            <Badge key={i} variant="outline" onClick={() => handleUseSuggestion(h, 'hashtag')} className="cursor-pointer hover:bg-secondary">
                                {h}
                            </Badge>
                        ))}
                    </div>
                </div>
            </div>
            )}
        </div>


        <Button type="submit" className="w-full" size="lg">
          Post
        </Button>
      </form>
    </Form>
  );
}
