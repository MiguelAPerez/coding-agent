import { NextResponse } from "next/server";
import { getCachedRepositories } from "@/app/actions/repositories";

export async function GET() {
    try {
        const repos = await getCachedRepositories();
        // Return only enabled repositories
        const enabledRepos = repos.filter(r => r.enabled);
        return NextResponse.json(enabledRepos);
    } catch (error) {
        console.error("Failed to fetch repositories:", error);
        return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 });
    }
}
