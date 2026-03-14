import { db } from "@/../db";
import { chats } from "@/../db/schema";
import { eq, and, lt } from "drizzle-orm";

/**
 * Deletes external (Discord) chats that haven't been updated in 2 days.
 */
export async function cleanupOldExternalChats() {
    console.log("[ChatCleanup] Starting cleanup of old external chats...");
    
    // Calculate the threshold date (2 days ago)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    // Find chats where type is discord AND (updatedAt < twoDaysAgo OR createdAt < twoDaysAgo)
    // Actually, updatedAt is the primary heartbeat.
    const oldChats = await db.select().from(chats).where(
        and(
            eq(chats.type, "discord"),
            lt(chats.updatedAt, twoDaysAgo)
        )
    ).all();
    
    console.log(`[ChatCleanup] Found ${oldChats.length} chats to delete.`);
    
    let deletedCount = 0;
    for (const chat of oldChats) {
        try {
            await db.delete(chats).where(eq(chats.id, chat.id)).run();
            deletedCount++;
        } catch (err) {
            console.error(`[ChatCleanup] Failed to delete chat ${chat.id}:`, err);
        }
    }
    
    console.log(`[ChatCleanup] Successfully deleted ${deletedCount} old chats.`);
    return {
        deletedCount,
        processedCount: oldChats.length
    };
}
