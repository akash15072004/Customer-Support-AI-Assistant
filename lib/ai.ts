import OpenAI from 'openai';

export const CATEGORIES = ['general_question','technical_issue','billing','urgent'] as const;
export type Category = typeof CATEGORIES[number];
export type AIResult = { classification: Category; confidence: number; escalate: boolean; reason: string; response: string };

const KNOWLEDGE_BASE = `
Product: AcmeCloud, a fictional SaaS workspace product for this demo.
- Login/password: Customers can use “Forgot password” on the sign-in page. Reset emails normally arrive within 5 minutes. If not received, check spam and verify the account email.
- Billing: Billing questions can cover invoices, plans, failed payments, or cancellation. Never invent a refund or payment outcome. Billing-specific account actions require a human.
- Technical issues: Ask for a concise description, steps to reproduce, and relevant error message. Do not claim an outage unless the customer provides evidence or a human confirms it.
- General: Explain basic product usage using only this knowledge base.
- Urgent: Security incidents, suspected account compromise, data loss, or service-blocking business-critical issues require human review.
`;

export async function classifyAndRespond(customerMessage: string): Promise<AIResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is missing.');
  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      { role:'system', content:`You are a cautious SaaS support triage assistant. Use ONLY the knowledge base below. Never fabricate policies, account state, refunds, outages, or actions. Classify exactly one category: general_question, technical_issue, billing, urgent. Set escalate=true when the request needs human intervention, is security/data-loss/business-critical, asks for an account-specific action you cannot perform, or you are uncertain. Confidence must be 0..1. Return JSON only with keys classification, confidence, escalate, reason, response. If escalating, response should transparently say a human will review it.\n\nKNOWLEDGE BASE:\n${KNOWLEDGE_BASE}` },
      { role:'user', content:customerMessage }
    ]
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error('LLM returned no content.');
  const parsed = JSON.parse(raw);
  if (
    !CATEGORIES.includes(parsed.classification) ||
    typeof parsed.confidence !== 'number' ||
    !Number.isFinite(parsed.confidence) ||
    parsed.confidence < 0 ||
    parsed.confidence > 1 ||
    typeof parsed.escalate !== 'boolean' ||
    typeof parsed.reason !== 'string' ||
    typeof parsed.response !== 'string'
  ) throw new Error('Invalid AI output.');
  const confidence = Math.max(0, Math.min(1, parsed.confidence));
  const escalate = parsed.escalate || confidence < 0.65;
  return { classification: parsed.classification, confidence, escalate, reason: parsed.reason, response: parsed.response };
}
