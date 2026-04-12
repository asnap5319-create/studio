"use server";

import { aiCaptionAndHashtagSuggestions } from "@/ai/flows/ai-caption-hashtag-suggestions";
import type { AICaptionAndHashtagSuggestionsInput } from "@/ai/flows/ai-caption-hashtag-suggestions";

export async function getAiSuggestions(
  input: AICaptionAndHashtagSuggestionsInput
) {
  return await aiCaptionAndHashtagSuggestions(input);
}
