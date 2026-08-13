import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { classifyAndRespond } from '@/lib/ai';

export const runtime = 'nodejs';

async function getConversation(supabase: ReturnType<typeof getSupabaseAdmin>, id: string) {
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;

  const { data: messages, error: messageError } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });
  if (messageError) throw messageError;

  return { ...conversation, messages: messages || [] };
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('conversationId');
    if (!id) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    return NextResponse.json(await getConversation(supabase, id));
  } catch (e) {
    console.error('GET /api/support failed:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load conversation' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Guest';
    const text = typeof body.message === 'string' ? body.message.trim() : '';
    const existingId = typeof body.conversationId === 'string' ? body.conversationId : null;

    if (!text || text.length > 5000) {
      return NextResponse.json(
        { error: 'Message is required and must be under 5000 characters.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    let conversationId = existingId;

    // Reuse an existing conversation when the browser already has one.
    if (conversationId) {
      const { data: existingConversation, error } = await supabase
        .from('conversations')
        .select('id,status')
        .eq('id', conversationId)
        .maybeSingle();

      if (error) throw error;
      if (!existingConversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      if (existingConversation.status === 'escalated') {
        return NextResponse.json(
          { error: 'This conversation has already been escalated to human support. Start a new conversation for another issue.' },
          { status: 409 }
        );
      }
    }

    // Create/reuse the user because users.email is unique in the current schema.
    if (!conversationId) {
      let userId: string;

      if (email) {
        const { data: existingUser, error: lookupError } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        if (lookupError) throw lookupError;

        if (existingUser) {
          userId = existingUser.id;
        } else {
          const { data: createdUser, error: userError } = await supabase
            .from('users')
            .insert({ email, name })
            .select('id')
            .single();
          if (userError) throw userError;
          userId = createdUser.id;
        }
      } else {
        const { data: createdUser, error: userError } = await supabase
          .from('users')
          .insert({ name })
          .select('id')
          .single();
        if (userError) throw userError;
        userId = createdUser.id;
      }

      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({ user_id: userId, status: 'open' })
        .select('id')
        .single();
      if (conversationError) throw conversationError;
      conversationId = conversation.id;
    }

    // Current database uses messages.sender, not messages.role.
    const { data: customerMessage, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender: 'customer',
        content: text,
      })
      .select('*')
      .single();
    if (msgError) throw msgError;

    let result;
    let aiFailure: { failure_type: 'api_error' | 'timeout' | 'invalid_output'; detail: string } | null = null;

    try {
      result = await classifyAndRespond(text);
    } catch (e) {
      const detail = e instanceof Error ? e.message : 'Unknown AI processing error';
      console.error('AI processing failed; escalating safely:', e);
      aiFailure = {
        failure_type: detail.toLowerCase().includes('invalid') || detail.toLowerCase().includes('json')
          ? 'invalid_output'
          : 'api_error',
        detail,
      };
      result = {
        classification: 'technical_issue' as const,
        confidence: 0,
        escalate: true,
        reason: 'AI service failure or invalid AI output; human review required.',
        response: 'I’m sorry, but I could not safely process this request right now. I’ve sent it for human review.',
      };
    }

    // Store AI failure details without blocking the customer response.
    if (aiFailure) {
      const { error: failureError } = await supabase
        .from('ai_failures')
        .insert({
          conversation_id: conversationId,
          message_id: customerMessage.id,
          failure_type: aiFailure.failure_type,
          detail: aiFailure.detail,
        });
      if (failureError) console.error('AI failure logging failed:', failureError);
    }

    const newStatus = result.escalate ? 'escalated' : 'open';

    // Current conversations table stores status only for this workflow.
    // Classification/confidence/reason are stored on messages/escalations.
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ status: newStatus })
      .eq('id', conversationId);
    if (updateError) throw updateError;

    const { error: assistantError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender: 'ai',
        content: result.response,
        classification: result.classification,
        confidence: result.confidence,
      });
    if (assistantError) throw assistantError;

    if (result.escalate) {
      const dedupeKey = `${conversationId}:${customerMessage.id}`;

      const { data: escalationEvent, error: escalationError } = await supabase
        .from('escalations')
        .insert({
          conversation_id: conversationId,
          message_id: customerMessage.id,
          classification: result.classification,
          reason: result.reason,
          dedupe_key: dedupeKey,
        })
        .select('id,conversation_id,message_id,classification,reason,dedupe_key,created_at')
        .single();

      const duplicate = escalationError?.code === '23505';
      if (escalationError && !duplicate) {
        console.error('Escalation insert failed:', escalationError);
      }

      if (escalationEvent) {
        try {
          const response = await notifyN8n({
            conversation_id: escalationEvent.conversation_id,
            customer_message: text,
            classification: escalationEvent.classification,
            reason: escalationEvent.reason,
          });

          if (response.ok) {
            await supabase
              .from('escalations')
              .update({ status: 'notified', notified_at: new Date().toISOString() })
              .eq('id', escalationEvent.id);
          }
        } catch (n8nError) {
          // Escalation is already persisted; notification failure must not fail the customer request.
          console.error('n8n notification failed:', n8nError);
        }
      }
    }

    return NextResponse.json({
      conversation: await getConversation(supabase, conversationId),
    });
  } catch (e) {
    console.error('POST /api/support failed:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Support request failed' },
      { status: 500 }
    );
  }
}

async function notifyN8n(payload: {
  conversation_id: string;
  customer_message: string;
  classification: string;
  reason: string;
}) {
  const webhookUrl = process.env.N8N_ESCALATION_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('N8N_ESCALATION_WEBHOOK_URL is not configured; skipping notification.');
    return new Response(null, { status: 204 });
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`n8n webhook failed with status ${response.status}`);
  }

  return response;
}
