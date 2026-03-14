"use server"

import { db } from "@/../db"
import { users } from "@/../db/schema"
import { eq } from "drizzle-orm"
import bcryptjs from "bcryptjs"
import { ensureUserScaffold } from "@/lib/scaffold"

export async function updateProfile(
    userId: string,
    data: {
        name?: string
        username?: string
        email?: string
        newPassword?: string
    }
) {
    if (!userId) {
        return { error: "Unauthorized." }
    }

    const user = await db.select().from(users).where(eq(users.id, userId)).get()
    if (!user) {
        return { error: "User not found." }
    }

    const updates: Partial<typeof users.$inferInsert> = {}

    // Handle name update
    if (data.name !== undefined && data.name.trim() !== (user.name ?? "")) {
        updates.name = data.name.trim() || null
    }

    // Handle email update
    if (data.email && data.email !== user.email) {
        const existingEmail = await db.select().from(users).where(eq(users.email, data.email)).get()
        if (existingEmail) {
            return { error: "An account with that email already exists." }
        }
        updates.email = data.email
    }

    // Handle username update
    if (data.username && data.username !== user.username) {
        const existing = await db.select().from(users).where(eq(users.username, data.username)).get()
        if (existing) {
            return { error: "Username is already taken." }
        }
        updates.username = data.username
    }

    // Handle password update
    if (data.newPassword) {
        if (!user.password) {
            return { error: "Cannot change password for this account type." }
        }
        if (data.newPassword.length < 8) {
            return { error: "New password must be at least 8 characters." }
        }
        updates.password = await bcryptjs.hash(data.newPassword, 10)
    }

    if (Object.keys(updates).length === 0) {
        return { error: "No changes to save." }
    }

    try {
        await db.update(users).set(updates).where(eq(users.id, userId))
        return { success: true, updatedUsername: updates.username }
    } catch (error) {
        console.error("Failed to update profile:", error)
        return { error: "Failed to update profile." }
    }
}

export async function registerUser(formData: FormData) {
    const name = formData.get("name") as string
    const username = formData.get("username") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    if (!email || !username || !password || !name) {
        return { error: "Missing required fields." }
    }

    // Check if user exists by email or username
    const existingEmailUser = await db.select().from(users).where(eq(users.email, email)).get()
    if (existingEmailUser) {
        return { error: "User already exists with this email." }
    }

    const existingUsername = await db.select().from(users).where(eq(users.username, username)).get()
    if (existingUsername) {
        return { error: "Username is already taken." }
    }

    const hashedPassword = await bcryptjs.hash(password, 10)

    try {
        const [insertedUser] = await db.insert(users).values({
            name,
            username,
            email,
            password: hashedPassword,
        }).returning()
        
        if (insertedUser) {
            await ensureUserScaffold(insertedUser.id)
        }
        return { success: true }
    } catch (error) {
        console.error("Failed to register user:", error)
        return { error: "Failed to create account." }
    }
}
