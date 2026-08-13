# Customer Support AI Assistant with Human Handoff

A small support system built for the Software Development Intern technical challenge. The flow is intentionally focused: customer message → AI classification/response → safe human escalation when needed → n8n notification.

## Architecture

```text
Browser (Next.js)
      |
      v
POST /api/support
      |
      +--> Supabase: users / conversations / messages / escalations / ai_failures
      |
      +--> OpenAI: classify + answer from demo KB
      |
      +--> Supabase: update conversation + assistant message
      |
      +--> escalations (dedupe_key + pending-conversation uniqueness)
                    |
                    v
             n8n Webhook (direct)
                    |
                    v
             Notification node
             (Email / Slack / etc.)
```

## Features

- Customer can start a conversation and view message history.
- Messages are classified into exactly `general_question`, `technical_issue`, `billing`, or `urgent`.
- AI answers only from the fictional AcmeCloud knowledge base in `lib/ai.ts`.
- Low confidence (< 0.65), urgent/security/data-loss requests, account-specific actions, and uncertain cases are escalated.
- AI/API failure or malformed output falls back to a safe human-handoff response.
- `escalations.dedupe_key` is unique and a partial unique index prevents multiple pending escalations for one conversation.
- A newly created escalation event is sent directly to the n8n webhook.
- n8n can forward the event to email, Slack, Teams, or another notification channel.
- Already-escalated conversations cannot accidentally be reopened by another customer message.

## Local setup

### 1. Prerequisites

- Node.js 20+
- A Supabase project
- An OpenAI API key
- n8n (local or hosted, with a reachable webhook URL)

### 2. Install

```bash
npm install
cp .env.example .env.local
```

Fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_MODEL=gpt-4o-mini
N8N_ESCALATION_WEBHOOK_URL=https://YOUR_N8N_HOST/webhook/escalation
```

**Security:** `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` are server secrets. Never prefix them with `NEXT_PUBLIC_` and never expose them to browser code.

### 3. Create the database

Open Supabase SQL Editor and run `supabase/schema.sql`.

The schema creates `users`, `conversations`, `messages`, `escalations`, and `ai_failures`. The code is aligned with the existing database columns: `messages.sender`, `conversations.status`, and `escalations.*`. RLS is enabled because database access is performed by the trusted Next.js server using the service-role key. If direct browser access is added later, create proper per-user RLS policies first.

### 4. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## n8n setup

1. Import `n8n/escalation-workflow.json` into n8n.
2. Open the **Escalation Webhook** node and use its **Production URL**.
3. Set that URL as `N8N_ESCALATION_WEBHOOK_URL` in `.env.local`.
4. Open **Send Email Notification** and configure n8n SMTP/email credentials, sender, and recipient. The imported node uses placeholder addresses that you must replace.
5. If you prefer Slack/Teams, replace that node with your preferred notification integration and keep the same fields from **Format Notification**.
6. Activate the workflow.

The supplied workflow validates the event, formats the required notification, sends an email notification, and then returns a success response. The Next.js server sends this JSON to n8n when a new escalation event is created:

```json
{
  "conversation_id": "...",
  "customer_message": "...",
  "classification": "urgent",
  "reason": "..."
}
```

The application intentionally treats n8n notification delivery as non-blocking: if n8n is down, the escalation remains stored in Supabase and the customer request still completes. The server logs the notification failure for investigation/retry handling.

## Reliability / failure handling

1. **LLM/API failure** → safe fallback response + escalation.
2. **Invalid JSON / invalid category / invalid field types / invalid confidence** → safe fallback response + escalation.
3. **Low confidence** → escalation.
4. **Duplicate escalation** → database uniqueness on `escalation_events.conversation_id`; duplicate insert (`23505`) is treated as idempotent.
5. **Missing/invalid message** → HTTP 400.
6. **Already-escalated conversation** → HTTP 409 and the customer is asked to start a new conversation.
7. **n8n failure** → customer request is not failed; the escalation event remains persisted and the notification failure is logged.
8. **Missing n8n URL** → escalation remains persisted; notification is skipped with a server warning.

## Demo test cases

1. `How do I reset my password?` → normally a general/technical answer without escalation.
2. `I was charged twice and need a refund.` → billing + escalation because an account-specific billing action requires a human.
3. `Someone accessed my account and changed my email.` → urgent + escalation.
4. `I'm unable to log in. I tried resetting my password twice but I still haven't received the email.` → technical issue; escalate if the AI cannot safely resolve it.
5. Temporarily remove or invalidate `OPENAI_API_KEY` → safe fallback + escalation.
6. Send another message to an already escalated conversation → HTTP 409; it must not reopen the conversation or create another escalation event.

## Important implementation decisions

### Why classify and respond in one LLM call?
For this small demo it reduces latency and implementation surface. The response is constrained by a tiny knowledge base and JSON output validation. A larger production system could separate classification and answer generation for better observability and independent evaluation.

### Why escalate on low confidence?
The challenge says to hand off when the AI is uncertain rather than pretending it can solve the issue. A 0.65 threshold is a documented demo assumption, not a production-calibrated number.

### Why use a unique escalation event?
A conversation can be processed more than once. The unique `dedupe_key` plus pending-conversation constraint makes event creation idempotent, preventing multiple escalation records for one conversation.

### Why direct n8n webhook instead of a Supabase Database Webhook?
The challenge only requires an n8n workflow triggered by escalation. A direct server-to-n8n webhook keeps the trigger explicit and makes the demo easier to understand and test. Supabase remains the source of record for escalation events.

### Why a fictional knowledge base?
The challenge permits creating a small demo knowledge base. This avoids inventing policies about a real company.

## What I would improve if I had another week

- Add authenticated customer accounts and strict row-level security.
- Add an internal agent dashboard for viewing and resolving escalations.
- Add realtime Supabase updates and streaming responses.
- Add automated evaluation datasets for classification accuracy and hallucination rate.
- Add structured tracing for LLM latency, token cost, confidence, and escalation rate.
- Add rate limiting, abuse protection, PII redaction, and audit logs.
- Make the knowledge base editable and use RAG/embeddings instead of a hard-coded prompt.
- Add integration tests for LLM failures, malformed output, retries, and duplicate webhook deliveries.

## Challenge questions

### 1. A technical problem I personally got stuck on

**Replace this with a real example from your own experience before submitting.** Do not claim an AI-generated story as personal experience.

A strong structure is: exact bug → first hypothesis → first fix that failed → logs/network/database investigation → root cause → final fix → lesson learned.

### 2. What I worked on yesterday

**Replace this with your actual timeline.** Start from the first task, explain what you implemented yourself, and explicitly state where you used documentation, tutorials, or AI tools.

### 3. If the chatbot suddenly gives incorrect answers

I would first determine whether the issue is broad or limited to a particular intent. I would inspect recent conversations and compare incorrect answers with customer inputs, classification, confidence, model, prompt/knowledge-base version, and application logs.

Then I would narrow it down systematically:

1. Reproduce several incorrect cases with the exact production inputs.
2. Check whether the classifier is assigning the wrong category.
3. Check whether the knowledge base contains missing, stale, or contradictory information.
4. Check prompt/model/config changes and recent deployments.
5. Check malformed or truncated model output and response validation.
6. Compare model output with a known-good evaluation set.
7. If the issue is unsafe, temporarily increase escalation/fallback behavior while investigating.
8. Fix the root cause, add regression tests for the failing examples, and monitor the error rate after deployment.

## Submission checklist

- [ ] GitHub repository
- [ ] Working deployed app or clear local setup
- [ ] Supabase schema/migration
- [ ] n8n workflow
- [ ] README with architecture, assumptions, decisions
- [ ] “What I would improve if I had another week”
- [ ] Honest answers to all three challenge questions
