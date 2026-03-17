"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { ChatService } from "@/lib/chat/service";
import { revalidatePath } from "next/cache";

export type { ChatMessage, ChatResponse, FileChange, PendingSuggestion, TechnicalPlan, PlanStep } from "@/lib/chat/types";

// --- Public Actions ---

/**
 * Clears all messages from a chat.
 */
export async function clearChatMessages(chatId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    await ChatService.deleteChatMessages(chatId);
    revalidatePath(`/chat/${chatId}`);
}

/**
 * Deletes all chats for the current user.
 */
export async function deleteAllChats() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    await ChatService.deleteAllUserChats(session.user.id);
    revalidatePath("/chat");
}
