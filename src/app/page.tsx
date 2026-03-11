import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }
  // import package.json
  const packageContext = await import("../../package.json");

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden flex flex-col items-center justify-center border-b border-border/50">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none animate-pulse" />

        <div className="container px-4 mx-auto relative z-10 text-center">
          <div className="inline-flex items-center px-4 py-1.5 mb-8 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium animate-fade-in">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-ping" />
            Introducing Coding Agent v{packageContext.version}
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50">
            Manage software with <br className="hidden md:block" />
            <span className="text-primary italic">intelligence</span> at your side.
          </h1>

          <p className="text-xl text-foreground/60 max-w-2xl mx-auto mb-12 leading-relaxed animate-slide-up">
            The all-in-one platform for managing your codebase, automating workflows, and building with AI agents. Supercharge your development process today.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
            <Link
              href="/register"
              className="px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform w-full sm:w-auto"
            >
              Get Started for Free
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 glass border border-border/50 font-bold rounded-2xl hover:bg-foreground/5 transition-all w-full sm:w-auto"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-background/50 relative z-10">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Powerful capabilities</h2>
            <p className="text-foreground/60">Everything you need to automate your development workflow.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl glass border border-border/50 hover:border-primary/20 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 text-blue-500 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10h10V2z" /><path d="M22 2h-10v10h10V2z" /><path d="M12 12H2v10h10V12z" /><path d="M22 12h-10v10h10V12z" /></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Repository Management</h3>
              <p className="text-foreground/60">Seamlessly sync and manage your Git repositories with built-in visualization tools.</p>
            </div>

            <div className="p-8 rounded-3xl glass border border-border/50 hover:border-purple-500/20 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 text-purple-500 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">AI Docs Chat</h3>
              <p className="text-foreground/60">Ask questions about your codebase and get immediate, context-aware answers from our AI agents.</p>
            </div>

            <div className="p-8 rounded-3xl glass border border-border/50 hover:border-orange-500/20 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-6 text-orange-500 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Evaluation Lab</h3>
              <p className="text-foreground/60">Run benchmarks and evaluate your models to ensure the highest quality of completions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-12 border-t border-border/50">
        <div className="container px-4 mx-auto text-center">
          <p className="text-foreground/40 text-sm">
            © {new Date().getFullYear()} Coding Agent. Built with ❤️ for developers.
          </p>
        </div>
      </footer>
    </div>
  );
}
