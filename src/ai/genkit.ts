
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  // Stability के लिए gemini-1.5-flash का इस्तेमाल किया जा रहा है अगर 2.5 पर लोड ज़्यादा है
  model: googleAI.model('gemini-1.5-flash'),
});
