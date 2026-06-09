import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";

/**
 * Instancia central de Genkit con Gemini 2.5 Flash.
 * Requiere GOOGLE_GENAI_API_KEY en el entorno.
 */
export const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model("gemini-2.5-flash"),
});
