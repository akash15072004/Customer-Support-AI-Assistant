# Customer Support AI Assistant with Human Handoff

![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat&logo=openai&logoColor=white)
![n8n](https://img.shields.io/badge/n8n-EA4B71?style=flat&logo=n8n&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=flat&logo=vercel&logoColor=white)

> An AI-powered customer support system built for the **Software Development Intern Technical Challenge**.

The application allows customers to send support messages, uses AI to classify and respond to requests, and safely escalates conversations to a human when the AI is uncertain or the issue requires manual intervention.

---

## 🔗 Live Demo & Repository

| Resource | Link |
|---|---|
| 🚀 Live Demo | [customer-support-ai-assistant-two.vercel.app](https://customer-support-ai-assistant-two.vercel.app/) |
| 💻 GitHub Repository | [github.com/akash15072004/Customer-Support-AI-Assistant](https://github.com/akash15072004/Customer-Support-AI-Assistant) |

---

## 🏗️ Architecture

```
                         Customer
                            │
                            ▼
                  Next.js Support UI
                            │
                            ▼
                       Support API
                            │
             ┌──────────────┴──────────────┐
             ▼                             ▼
          OpenAI                        Supabase
             │                             │
     ┌───────┴───────┐             ┌───────┴───────┐
     ▼               ▼             ▼       ▼       ▼
Classification  Response        Users  Conversations Messages
                Generation                Escalations
                                           AI Failures
             │
             ▼
      Human Escalation
             │
             ▼
        n8n Webhook
             │
             ▼
      Email / Slack / Teams
```

---

## ✨ Features

- 💬 Customer support chat built with Next.js, React and TypeScript
- 🤖 AI-powered message classification
- 📂 Four supported classifications:
  - `general_question`
  - `technical_issue`
  - `billing`
  - `urgent`
- 📚 Knowledge-base-grounded AI responses
- 👤 Human escalation for urgent or uncertain requests
- 🛡️ Safe fallback when AI/API failures occur
- ✅ AI output validation
- 🗄️ Conversation and escalation storage using Supabase
- 🔔 n8n automation for escalation notifications
- 🔒 Duplicate escalation protection

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Database | Supabase / PostgreSQL |
| AI | OpenAI API |
| Automation | n8n |
| Version Control | Git / GitHub |
| Deployment | Vercel |

---

## 📁 Project Structure

```
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

---

## 🔄 How It Works

1. Customer sends a support message.
2. The message is stored in Supabase.
3. OpenAI classifies the request.
4. Relevant knowledge-base information is retrieved.
5. AI generates a grounded response.
6. Urgent, low-confidence, unsupported, or failed requests are escalated.
7. Escalation details are stored in Supabase.
8. n8n sends a notification to the support team.

---

## 👤 Human Handoff

The AI escalates a conversation when:

- The request is urgent.
- The confidence score is below the configured threshold.
- The issue requires account-specific human action.
- The knowledge base does not contain enough information.
- The AI/API fails.
- The AI returns invalid output.

> **Fail-safe approach:** The system prefers escalation over guessing or providing unsupported information.

---

## 🗄️ Supabase

Supabase is used to store:

- Users
- Conversations
- Messages
- Escalations
- AI failures

Database schema: [`supabase/schema.sql`](./supabase/schema.sql)

---

## 🔔 n8n Automation

The n8n workflow is available at: [`n8n/escalation-workflow.json`](./n8n/escalation-workflow.json)

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

---

## 🚀 Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/akash15072004/Customer-Support-AI-Assistant.git
cd Customer-Support-AI-Assistant
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini

N8N_ESCALATION_WEBHOOK_URL=your_n8n_webhook_url
```

> ⚠️ **Never commit `.env.local` or API keys to GitHub.**

### 4. Setup Supabase

Run the SQL schema from `supabase/schema.sql` in the Supabase SQL Editor.

### 5. Start the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🛡️ Reliability & Failure Handling

| Failure Case | Handling |
|---|---|
| LLM/API failure | Safe fallback and conversation escalation |
| Invalid AI output | Classification and confidence validation |
| Low confidence | Escalation instead of guessing |
| Duplicate escalation | Database-level protection |
| Missing knowledge | Unsupported issues are escalated |
| n8n failure | Escalation remains stored in Supabase |

---

## 🧠 Key Technical Decisions

**AI Classification**
A classification layer separates requests into four categories and uses confidence to decide whether human intervention is required.

**Knowledge-Base Grounding**
The AI is instructed to answer only from the provided knowledge base and avoid inventing product behavior, policies, refunds, URLs, or account information.

**Human Handoff**
The system is designed to fail safely. When the AI cannot confidently or safely answer, it escalates instead of pretending to know the answer.

**n8n**
n8n provides a simple automation layer for notifying the support team when escalation occurs.

---

## 📈 What I Would Improve If I Had Another Week

- Add a support-agent dashboard.
- Add authentication and stricter Row Level Security.
- Add automated tests for AI classification and escalation.
- Add AI evaluation and monitoring.
- Add rate limiting and abuse protection.
- Add better logging and observability.
- Improve the knowledge base with RAG.
- Add retry handling for failed n8n notifications.

---

## 📝 Challenge Questions

### Question 1 — Tell us about one technical problem you personally got stuck on.

One issue I got stuck on was the message API returning `405 Method Not Allowed` when I tried to send a customer message. The GET request for fetching messages was working with a 200 response, but the POST request was failing.

I first checked the browser request and the Next.js terminal logs to confirm that the problem was specifically with the POST method. I then inspected the API route structure and compared the endpoint used by the frontend with the actual Next.js App Router route.

I found that the frontend was sending the message to `/api/conversations/[id]/messages`, while the route only implemented a GET handler. The frontend and backend therefore did not have matching HTTP methods. I fixed the endpoint implementation and verified the behavior again through the terminal logs.

I also ran `npm run build` to make sure the project compiled successfully. This helped me separate the API behavior issue from build/type errors and confirm that the codebase remained valid after the change.

### Question 2 — Walk us through what you actually worked on yesterday.

I started by understanding the challenge requirements and breaking the system into the customer UI, Supabase data layer, AI pipeline, escalation logic, and automation. I then worked on the Next.js support interface and the conversation/message API flow.

After that, I connected the application with Supabase and verified that conversations and messages could be created and retrieved. I worked on the AI pipeline for classification and knowledge-base-based responses, including fallback behavior when the AI could not safely answer.

During testing, I used the terminal logs to investigate the 405 POST error. I checked the API route files, verified which handlers were actually exported, corrected the frontend/backend endpoint mismatch, and rebuilt the application.

I used AI tools mainly as a development aid for debugging, reviewing implementation approaches, and improving code structure. I also relied on project documentation, framework behavior, and direct testing rather than assuming generated code was correct. The final decisions and testing were based on what I observed in my own application.

### Question 3 — Imagine this chatbot is live and suddenly starts giving customers incorrect answers.

I would first reproduce the issue using the same customer inputs and capture the exact incorrect responses. I would then determine whether the problem is coming from the knowledge base, prompt, classification, retrieved context, model output, or application logic.

I would compare the current behavior with previously correct examples and inspect logs and stored conversation data. I would also check whether the knowledge-base content was changed, whether the wrong entries were retrieved, or whether the model was receiving incomplete or incorrect context.

If the responses were unsafe or unreliable, I would temporarily increase human escalation or fallback behavior while investigating. After identifying the root cause, I would fix it, add regression tests for the failed cases, deploy the change, and monitor the results.

---

## 👨‍💻 Developed By

<table>
<tr>
<td>

### Akash Chaudhary
**Software Development Intern Technical Challenge**
Customer Support AI Assistant with Human Handoff

🔗 [GitHub](https://github.com/akash15072004) &nbsp;•&nbsp; 🚀 [Live Demo](https://customer-support-ai-assistant-two.vercel.app/)

</td>
</tr>
</table>

---

<p align="center"><i>Built as part of the Software Development Intern technical challenge.</i></p>
