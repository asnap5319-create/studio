
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

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
  const flow = ai.defineFlow(
    {
      name: 'supportFlow',
      inputSchema: SupportInputSchema,
      outputSchema: SupportOutputSchema,
    },
    async (input) => {
      const { output } = await ai.generate({
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
        1. Greet the user warmly.
        2. Address their specific query: "${input.query}"
        3. Analyze their stats and tell them what's missing (kami) in their channel.
        4. Provide actionable suggestions in Hindi or English (Hinglish is preferred as users are from India).
        
        Keep it professional, encouraging, and concise.`,
        output: { schema: SupportOutputSchema }
      });
      return output!;
    }
  );

  return flow(input);
}
