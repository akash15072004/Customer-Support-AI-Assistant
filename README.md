
# Customer Support AI Assistant with Human Handoff

A small AI-powered customer support system built for the Software Development Intern technical challenge.

The system allows customers to send support messages, uses AI to classify and respond to them, and escalates cases to a human when the AI is uncertain or the issue requires manual intervention.

## Links

- Live Demo: https://customer-support-ai-assistant-two.vercel.app/
- GitHub: https://github.com/akash15072004/Customer-Support-AI-Assistant

## Architecture

```text
Customer
   |
   v
Next.js Support UI
   |
   v
Support API
   |
   +----> OpenAI
   |       |
   |       +--> Classification
   |       +--> Response Generation
   |
   +----> Supabase
   |       |
   |       +--> Users
   |       +--> Conversations
   |       +--> Messages
   |       +--> Escalations
   |       +--> AI Failures
   |
   +----> Human Escalation
             |
             v
          n8n Webhook
             |
             v
       Email / Slack / Teams
````

## Features

* Customer support chat built with Next.js and React.
* AI classification into:

  * `general_question`
  * `technical_issue`
  * `billing`
  * `urgent`
* AI responses grounded in a small knowledge base.
* Human escalation for urgent or uncertain requests.
* Safe fallback when the AI/API fails.
* Invalid AI output validation.
* Escalation information stored in Supabase.
* n8n automation for support notifications.
* Duplicate escalation protection.

## Tech Stack

* Next.js
* React
* TypeScript
* Supabase / PostgreSQL
* OpenAI API
* n8n
* Git / GitHub

## Project Structure

```text
Customer-Support-AI-Assistant/
│
├── src/
│   ├── app/
│   │   └── api/
│   ├── components/
│   ├── lib/
│   └── types/
│
├── supabase/
│   └── schema.sql
│
├── n8n/
│   └── escalation-workflow.json
│
├── package.json
└── README.md
```

## How It Works

1. Customer sends a support message.
2. The message is stored in Supabase.
3. OpenAI classifies the request.
4. Relevant knowledge-base information is retrieved.
5. AI generates a grounded response.
6. Urgent, low-confidence, unsupported, or failed requests are escalated.
7. Escalation details are stored in Supabase.
8. n8n sends a notification to the support team.

## Human Handoff

The AI escalates a conversation when:

* The request is urgent.
* The confidence score is below the configured threshold.
* The issue requires account-specific human action.
* The knowledge base does not contain enough information.
* The AI/API fails.
* The AI returns invalid output.

The system prefers escalation over guessing or providing unsupported information.

## Supabase

Supabase is used to store:

* Users
* Conversations
* Messages
* Escalations
* AI failures

The database schema is available in:

```text
supabase/schema.sql
```

## n8n Automation

The n8n workflow is available in:

```text
n8n/escalation-workflow.json
```

When a conversation is escalated, the application sends information such as:

```json
{
  "conversation_id": "conversation-id",
  "customer_message": "Customer message",
  "classification": "urgent",
  "reason": "Requires human review"
}
```

n8n can then forward the notification to email, Slack, Teams, or another support channel.

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/akash15072004/Customer-Support-AI-Assistant.git
cd Customer-Support-AI-Assistant
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini

N8N_ESCALATION_WEBHOOK_URL=your_n8n_webhook_url
```

Never commit `.env.local` or API keys to GitHub.

### 4. Setup Supabase

Run the SQL schema from:

```text
supabase/schema.sql
```

in the Supabase SQL Editor.

### 5. Start the application

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Reliability

The system handles common failure cases:

* **LLM/API failure:** returns a safe fallback and escalates the conversation.
* **Invalid AI output:** validates classification and confidence before continuing.
* **Low confidence:** escalates instead of guessing.
* **Duplicate escalation:** protected using database constraints.
* **Missing knowledge:** escalates unsupported technical issues.
* **n8n failure:** escalation remains stored in Supabase so the request is not lost.

## Key Technical Decisions

### AI Classification

A small classification layer separates requests into four categories and uses confidence to decide whether human intervention is required.

### Knowledge-Base Grounding

The AI is instructed to answer only from the provided knowledge base and avoid inventing product behavior, policies, refunds, URLs, or account information.

### Human Handoff

The system is designed to fail safely. When the AI cannot confidently or safely answer, it escalates instead of pretending to know the answer.

### n8n

n8n provides a simple automation layer for notifying the support team when escalation occurs.

## What I Would Improve If I Had Another Week

* Add a support-agent dashboard.
* Add authentication and stricter Row Level Security.
* Add automated tests for AI classification and escalation.
* Add AI evaluation and monitoring.
* Add rate limiting and abuse protection.
* Add better logging and observability.
* Improve the knowledge base with RAG.
* Add retry handling for failed n8n notifications.

## Challenge Questions

### 1. Tell us about one technical problem you personally got stuck on.

One issue I faced during development was an API routing mismatch between the frontend and backend.

The UI was working, but sending a message resulted in a `404`/`405` response. I checked the browser request and Next.js terminal logs to identify the endpoint being called.

I then inspected the API route structure and compared it with the frontend `fetch()` request. I found that the frontend and backend were using different API paths.

After correcting the endpoint and testing again, the request reached the backend successfully.

This taught me to first inspect the actual request, route structure, and server logs before making changes.

### 2. Walk us through what you actually worked on yesterday.

I started by reviewing the challenge requirements and breaking the problem into smaller parts.

I first worked on the Next.js support interface and conversation API. Then I connected Supabase and created the required database structure.

After that, I implemented the AI classification and response flow using OpenAI and a small knowledge base.

I then added human escalation for urgent, low-confidence, and unsupported requests.

Finally, I worked on the n8n escalation workflow and tested different failure cases, including API failures, invalid responses, duplicate escalation events, and API routing issues.

I used documentation, terminal logs, debugging, and AI tools where useful, while testing and modifying the implementation myself.

### 3. Imagine this chatbot is live and suddenly starts giving customers incorrect answers. What would you investigate first?

I would first collect a few incorrect conversations and determine whether the issue affects all requests or only specific categories.

I would check:

1. Customer input.
2. AI classification and confidence.
3. Knowledge-base content.
4. Prompt and model configuration.
5. Recent code or deployment changes.
6. Application and AI logs.

I would reproduce the issue with the same inputs and compare the results.

If the responses were unsafe, I would temporarily increase human escalation or fallback behavior while investigating.

After identifying the root cause, I would fix it, add regression tests for the failed cases, deploy the change, and monitor the results.

