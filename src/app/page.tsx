import React from "react";
import Link from "next/link";
import { getCachedRepositories } from "@/app/actions/repositories";
import { getAgentConfig } from "@/app/actions/config";
import { getSkills } from "@/app/actions/skills";
import { getTools } from "@/app/actions/tools";

export default async function Home() {
  const repos = await getCachedRepositories();
  const agentConfig = await getAgentConfig();
  const skills = await getSkills();
  const tools = await getTools();

  return (
    <main className="flex min-h-screen flex-col items-center p-6 sm:p-24 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-purple-500/20 blur-[120px] pointer-events-none" />

      <div className="z-10 w-full max-w-5xl animate-fade-in mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60 w-fit">
          Dashboard
        </h1>
        <p className="text-lg text-foreground/60 max-w-2xl">
          Overview of your active resources and configurations.
        </p>
      </div>

      <div className="z-10 grid text-left w-full max-w-5xl gap-6 md:grid-cols-2 animate-slide-up">
        {/* Repositories Directory Card */}
        <Link
          href="/repositories"
          className="group relative rounded-3xl glass p-8 transition-all hover:bg-foreground/5 hover:border-border hover:-translate-y-1 block border border-border/50 overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-400 opacity-80" />
          
          <div className="flex items-start justify-between mb-6">
            <div className="p-3 bg-blue-500/10 rounded-2xl">
              <svg xmlns="http://www.w3.org/http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
              </svg>
            </div>
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none text-blue-500 font-bold">
              -&gt;
            </span>
          </div>

          <h2 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
            Repositories
          </h2>
          <p className="mb-6 mt-0 text-foreground/60 leading-relaxed group-hover:text-foreground/80 transition-colors">
            Manage your Git repositories and synchronized codebases.
          </p>
          
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-4xl font-extrabold text-foreground">{repos?.length || 0}</span>
              <span className="text-xs uppercase tracking-wider text-foreground/50 font-semibold mt-1">Total Synced</span>
            </div>
          </div>
        </Link>

        {/* Agent Config Directory Card */}
        <Link
          href="/agent"
          className="group relative rounded-3xl glass p-8 transition-all hover:bg-foreground/5 hover:border-border hover:-translate-y-1 block border border-border/50 overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-400 opacity-80" />
          
          <div className="flex items-start justify-between mb-6">
            <div className="p-3 bg-purple-500/10 rounded-2xl">
               <svg xmlns="http://www.w3.org/http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500">
                <rect width="18" height="18" x="3" y="3" rx="2"/>
                <path d="M7 7h10"/><path d="M7 12h10"/><path d="M7 17h10"/>
              </svg>
            </div>
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none text-purple-500 font-bold">
              -&gt;
            </span>
          </div>

          <h2 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
            Agent Config
          </h2>
          <p className="mb-6 mt-0 text-foreground/60 leading-relaxed group-hover:text-foreground/80 transition-colors">
            Configure system instructions, skills, and tools.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col overflow-hidden">
              <span className="text-2xl font-bold text-foreground truncate" title={agentConfig?.model || "Not set"}>{agentConfig?.model || "Not set"}</span>
              <span className="text-xs uppercase tracking-wider text-foreground/50 font-semibold mt-1">Active Model</span>
            </div>
            <div className="flex gap-6">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-foreground">{skills?.length || 0}</span>
                <span className="text-xs uppercase tracking-wider text-foreground/50 font-semibold mt-1">Skills</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-foreground">{tools?.length || 0}</span>
                <span className="text-xs uppercase tracking-wider text-foreground/50 font-semibold mt-1">Tools</span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </main>
  );
}
