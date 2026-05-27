
'use server';

/**
 * @fileOverview A.snap AI Support Flow
 * Handles user queries with channel stats analysis.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const SupportInputSchema = z.object({
  query: z.string().describe('The user query or concern.'),
  userName: z.string().describe('The name of the user.'),
  stats: z.object({
    followers: z.number(),
    posts: z.number(),
    views: z.number(),
    earnings: z.number(),
  }).describe('The current channel stats of the user.'),
});

const SupportOutputSchema = z.object({
  response: z.string().describe('The AI generated response to the user query.'),
  suggestions: z.array(z.string()).describe('Specific improvement suggestions for the channel.'),
});

export async function getAiSupport(input: z.infer<typeof SupportInputSchema>) {
  const supportFlow = ai.defineFlow(
    {
      name: 'supportFlow',
      inputSchema: SupportInputSchema,
      outputSchema: SupportOutputSchema,
    },
    async (input) => {
      try {
        const { output } = await ai.generate({
          // Backup के तौर पर 1.5-flash का इस्तेमाल ताकि 503 एरर कम आए
          model: googleAI.model('gemini-1.5-flash'),
          prompt: `You are the A.snap AI Support Assistant. Your goal is to help users succeed on the platform.
        
          User: ${input.userName}
          Stats:
          - Followers: ${input.stats.followers}
          - Posts: ${input.stats.posts}
          - Total Views: ${input.stats.views}
          - Current Earnings: ₹${input.stats.earnings}

          Platform Rules:
          - Monetization unlocks at 50 followers, 2000 views, and ₹100 earnings.
          - High quality reels with captions perform better.

          Instruction: 
          1. Greet the user warmly in Hindi/Hinglish.
          2. Address their specific query: "${input.query}"
          3. Analyze their stats and tell them what's missing (kami) in their channel to reach monetization.
          4. Provide 3 actionable suggestions in Hinglish.
        
          Keep it professional, encouraging, and concise.`,
          output: { schema: SupportOutputSchema }
        });

        if (!output) {
          throw new Error('AI failed to generate a response.');
        }

        return output;
      } catch (error: any) {
        console.error("Flow execution error:", error);
        return {
          response: "माफी चाहता हूँ, अभी मेरे सर्वर पर बहुत लोड है। कृपया कुछ देर बाद फिर से प्रयास करें।",
          suggestions: ["इंटरनेट कनेक्शन चेक करें", "कुछ देर इंतज़ार करें"]
        };
      }
    }
  );

  return supportFlow(input);
}
