'use server';
/**
 * @fileOverview An AI agent that suggests engaging captions and relevant hashtags for social media posts.
 *
 * - aiCaptionAndHashtagSuggestions - A function that handles the caption and hashtag suggestion process.
 * - AICaptionAndHashtagSuggestionsInput - The input type for the aiCaptionAndHashtagSuggestions function.
 * - AICaptionAndHashtagSuggestionsOutput - The return type for the aiCaptionAndHashtagSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AICaptionAndHashtagSuggestionsInputSchema = z.object({
  postDescription: z
    .string()
    .describe('A brief text description of the social media post content.'),
  imageDataUri:
    z.string()
      .optional()
      .describe(
        "An optional photo of the post content, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
      ),
});
export type AICaptionAndHashtagSuggestionsInput = z.infer<
  typeof AICaptionAndHashtagSuggestionsInputSchema
>;

const AICaptionAndHashtagSuggestionsOutputSchema = z.object({
  captionSuggestions: z
    .array(z.string())
    .describe('An array of engaging caption suggestions for the post.'),
  hashtagSuggestions: z
    .array(z.string())
    .describe('An array of relevant hashtag suggestions for the post.'),
});
export type AICaptionAndHashtagSuggestionsOutput = z.infer<
  typeof AICaptionAndHashtagSuggestionsOutputSchema
>;

export async function aiCaptionAndHashtagSuggestions(
  input: AICaptionAndHashtagSuggestionsInput
): Promise<AICaptionAndHashtagSuggestionsOutput> {
  return aiCaptionAndHashtagSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'captionAndHashtagPrompt',
  input: {schema: AICaptionAndHashtagSuggestionsInputSchema},
  output: {schema: AICaptionAndHashtagSuggestionsOutputSchema},
  prompt: `You are an AI assistant specialized in creating engaging social media content. Your task is to generate several unique caption suggestions and relevant hashtags based on the provided post description and an optional image.

Be creative and consider the context. Aim for a friendly and appealing tone.

Post Description: {{{postDescription}}}
{{#if imageDataUri}}Image: {{media url=imageDataUri}}{{/if}}

Please provide 3-5 distinct caption suggestions and 5-10 relevant hashtags. Format your response as a JSON object with 'captionSuggestions' as an array of strings and 'hashtagSuggestions' as an array of strings.
`,
});

const aiCaptionAndHashtagSuggestionsFlow = ai.defineFlow(
  {
    name: 'aiCaptionAndHashtagSuggestionsFlow',
    inputSchema: AICaptionAndHashtagSuggestionsInputSchema,
    outputSchema: AICaptionAndHashtagSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
