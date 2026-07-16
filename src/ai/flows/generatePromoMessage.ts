import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { logAiUsage } from "@/lib/metrics";

// Generación de mensajes promocionales con Claude (Haiku 4.5), migrado desde
// Genkit/Gemini. Usa TOOL USE para forzar el JSON del schema; si algo falla
// (sin API key, rate limit, respuesta inválida) cae a un fallback estático.
// Requiere ANTHROPIC_API_KEY en el entorno.

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

const MODEL = "claude-haiku-4-5-20251001"; // barato + rápido; unificado con barbería

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

const PROMO_TOOL: Anthropic.Tool = {
  name: "emitir_promo",
  description: "Emite el mensaje promocional personalizado para el cliente.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Título corto, máx 40 caracteres, con 1 emoji de sushi." },
      message: { type: "string", description: "Mensaje cálido en español chileno informal, máx 150 caracteres." },
      cta: { type: "string", description: "Llamado a la acción, máx 20 caracteres." },
      context: { type: "string", description: "Resumen del segmento usado (ej. roll_master, aprendiz)." },
    },
    required: ["title", "message", "cta", "context"],
  },
};

/**
 * Genera un mensaje promocional personalizado en español chileno informal.
 * Si la IA falla (rate limit, sin API key, respuesta inválida), devuelve fallback.
 */
export async function generatePromoMessage(input: PromoInput): Promise<PromoOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallback(input);

  try {
    const client = new Anthropic({ apiKey });
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      tools: [PROMO_TOOL],
      tool_choice: { type: "tool", name: "emitir_promo" },
      messages: [
        {
          role: "user",
          content: `Eres el chef de SushiPro, un sushi chileno. Escribe en español chileno informal y cercano (sin ser exagerado).
Cliente: ${input.userName}
Sellos actuales: ${input.sellosCount}
Días sin visitar: ${input.diasSinVisita}
${input.context ? `Contexto: ${input.context}` : ""}

Crea un mensaje para invitarlo a volver y canjear/juntar sellos. Respeta los límites de caracteres.`,
        },
      ],
    });

    try { await logAiUsage(MODEL, resp.usage.input_tokens, resp.usage.output_tokens); } catch { /* métrica no crítica */ }

    const toolUse = resp.content.find((b) => b.type === "tool_use");
    if (toolUse && toolUse.type === "tool_use") {
      const parsed = PromoOutputSchema.safeParse(toolUse.input);
      if (parsed.success) return parsed.data;
    }
    return fallback(input);
  } catch {
    return fallback(input);
  }
}
