import { z } from "genkit";
import { ai } from "@/ai/genkit";

export const PromoInputSchema = z.object({
  userName: z.string().describe("Nombre del cliente"),
  sellosCount: z.number().describe("Sellos actuales del cliente"),
  diasSinVisita: z.number().describe("Días desde la última visita"),
  context: z
    .string()
    .optional()
    .describe("Contexto adicional (promo del día, etc.)"),
});
export type PromoInput = z.infer<typeof PromoInputSchema>;

export const PromoOutputSchema = z.object({
  title: z.string().describe("Título corto, máx 40 caracteres, con emoji"),
  message: z.string().describe("Mensaje cálido, máx 150 caracteres"),
  cta: z.string().describe("Llamado a la acción, máx 20 caracteres"),
  context: z.string().describe("Resumen del segmento usado"),
});
export type PromoOutput = z.infer<typeof PromoOutputSchema>;

function fallback(input: PromoInput): PromoOutput {
  const cerca = input.sellosCount >= 5;
  return {
    title: cerca ? "¡Estás cerca! 🍣" : "Te esperamos 🥢",
    message: cerca
      ? `${input.userName}, te faltan pocos sellos para tu premio. ¡Pásate por SushiPro!`
      : `${input.userName}, un antojito de sushi suma sellos. ¡Te esperamos!`,
    cta: "Pedir ahora",
    context: cerca ? "roll_master" : "aprendiz",
  };
}

/**
 * Genera un mensaje promocional personalizado en español chileno informal.
 * Si la IA falla (rate limit, sin API key), devuelve un fallback estático.
 */
export const generatePromoMessage = ai.defineFlow(
  {
    name: "generatePromoMessage",
    inputSchema: PromoInputSchema,
    outputSchema: PromoOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await ai.generate({
        prompt: `Eres el chef de SushiPro, un sushi chileno. Escribe en español chileno informal y cercano (sin ser exagerado).
Cliente: ${input.userName}
Sellos actuales: ${input.sellosCount}
Días sin visitar: ${input.diasSinVisita}
${input.context ? `Contexto: ${input.context}` : ""}

Crea un mensaje push para invitarlo a volver y canjear/juntar sellos.
Reglas: title máx 40 caracteres con 1 emoji de sushi; message máx 150 caracteres; cta máx 20 caracteres.`,
        output: { schema: PromoOutputSchema },
      });
      return output ?? fallback(input);
    } catch {
      return fallback(input);
    }
  }
);
