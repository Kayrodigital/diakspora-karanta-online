import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
type Row<Name extends keyof Tables> = Tables[Name]["Row"];

export type PedagogicalConversation = Row<"pedagogical_conversations">;
export type PedagogicalMessage = Row<"pedagogical_messages">;
export type SupportTicket = Row<"support_tickets">;
export type SupportMessage = Row<"support_messages">;

export async function loadPedagogicalConversations(organizationId: string) {
  const { data, error } = await supabase
    .from("pedagogical_conversations")
    .select("*")
    .eq("organization_id", organizationId)
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function loadPedagogicalMessages(organizationId: string, conversationId: string) {
  const { data, error } = await supabase
    .from("pedagogical_messages")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createPedagogicalConversation(input: {
  organizationId: string;
  learnerId: string;
  teacherUserId: string;
  subject: string;
  body: string;
}) {
  const { data: userResult } = await supabase.auth.getUser();
  const userId = userResult.user?.id;
  if (!userId) throw new Error("Votre session a expiré.");

  const { data: conversation, error: conversationError } = await supabase
    .from("pedagogical_conversations")
    .insert({
      organization_id: input.organizationId,
      learner_id: input.learnerId,
      teacher_user_id: input.teacherUserId,
      created_by: userId,
      subject: input.subject.trim(),
    })
    .select("*")
    .single();
  if (conversationError) throw conversationError;

  const { error: messageError } = await supabase.from("pedagogical_messages").insert({
    organization_id: input.organizationId,
    conversation_id: conversation.id,
    sender_user_id: userId,
    body: input.body.trim(),
  });
  if (messageError) throw messageError;
  return conversation;
}

export async function sendPedagogicalMessage(
  organizationId: string,
  conversationId: string,
  body: string,
) {
  const { data: userResult } = await supabase.auth.getUser();
  const userId = userResult.user?.id;
  if (!userId) throw new Error("Votre session a expiré.");
  const { error } = await supabase.from("pedagogical_messages").insert({
    organization_id: organizationId,
    conversation_id: conversationId,
    sender_user_id: userId,
    body: body.trim(),
  });
  if (error) throw error;
}

export async function loadSupportTickets(organizationId: string) {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("organization_id", organizationId)
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function loadSupportMessages(organizationId: string, ticketId: string) {
  const { data, error } = await supabase
    .from("support_messages")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createSupportTicket(input: {
  organizationId: string;
  subject: string;
  body: string;
  category: "technical" | "account" | "billing" | "other";
}) {
  const { data: userResult } = await supabase.auth.getUser();
  const userId = userResult.user?.id;
  if (!userId) throw new Error("Votre session a expiré.");

  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .insert({
      organization_id: input.organizationId,
      requester_user_id: userId,
      category: input.category,
      subject: input.subject.trim(),
    })
    .select("*")
    .single();
  if (ticketError) throw ticketError;

  const { error: messageError } = await supabase.from("support_messages").insert({
    organization_id: input.organizationId,
    ticket_id: ticket.id,
    sender_user_id: userId,
    body: input.body.trim(),
  });
  if (messageError) throw messageError;
  return ticket;
}

export async function sendSupportMessage(organizationId: string, ticketId: string, body: string) {
  const { data: userResult } = await supabase.auth.getUser();
  const userId = userResult.user?.id;
  if (!userId) throw new Error("Votre session a expiré.");
  const { error } = await supabase.from("support_messages").insert({
    organization_id: organizationId,
    ticket_id: ticketId,
    sender_user_id: userId,
    body: body.trim(),
  });
  if (error) throw error;
}

export async function updateSupportTicket(
  ticketId: string,
  values: { status: "open" | "in_progress" | "resolved" | "closed"; assignedTo?: string },
) {
  const { error } = await supabase
    .from("support_tickets")
    .update({
      status: values.status,
      assigned_to: values.assignedTo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);
  if (error) throw error;
}
