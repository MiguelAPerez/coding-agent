import { db } from "./db/index";
import { users } from "./db/schema";

async function test() {
    try {
        console.log("Fetching users...");
        const allUsers = db.select().from(users).all();
        console.log("Users in DB:");
        allUsers.forEach(u => console.log(`- ${u.name} (${u.email}) ID: ${u.id}`));
    } catch (error) {
        console.error("Query failed:", error);
    }
}

test();
