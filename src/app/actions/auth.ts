"use server"

import { db } from "@/../db"
import { users } from "@/../db/schema"
import { eq } from "drizzle-orm"
import bcryptjs from "bcryptjs"

export async function registerUser(formData: FormData) {
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    if (!email || !password || !name) {
        return { error: "Missing required fields." }
    }

    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).get()

    if (existingUser) {
        return { error: "User already exists with this email." }
    }

    const hashedPassword = await bcryptjs.hash(password, 10)

    try {
        await db.insert(users).values({
            name,
            email,
            password: hashedPassword,
        })
        return { success: true }
    } catch (error) {
        console.error("Failed to register user:", error)
        return { error: "Failed to create account." }
    }
}
