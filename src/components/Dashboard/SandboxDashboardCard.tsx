"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { listSandboxes, stopSandbox, SandboxInfo } from "@/app/actions/docker-sandboxes";

export default function SandboxDashboardCard() {
    const [sandboxes, setSandboxes] = useState<SandboxInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const loadSandboxes = async () => {
        try {
            const list = await listSandboxes();
            setSandboxes(list);
        } catch (error) {
            console.error("Failed to load sandboxes for dashboard", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadSandboxes();
    }, []);

    const handleStop = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setIsActionLoading(true);
        try {
            await stopSandbox(id);
            await loadSandboxes();
        } catch (error) {
            console.error("Failed to stop sandbox from dashboard", error);
        } finally {
            setIsActionLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="rounded-3xl glass p-8 border border-border/50 animate-pulse h-[280px]">
                <div className="h-10 w-10 bg-foreground/10 rounded-2xl mb-6" />
                <div className="h-8 w-48 bg-foreground/10 rounded mb-4" />
                <div className="h-4 w-full bg-foreground/10 rounded mb-2" />
                <div className="h-4 w-2/3 bg-foreground/10 rounded" />
            </div>
        );
    }

    const activeCount = sandboxes.length;
    const latestSandbox = sandboxes[0] || null;

    return (
        <Link
            href="/settings"
            className="group relative rounded-3xl glass p-8 transition-all hover:bg-foreground/5 hover:border-border hover:-translate-y-1 block border border-border/50 overflow-hidden"
        >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-80" />
            
            <div className="flex items-start justify-between mb-6">
                <div className="p-3 bg-emerald-500/10 rounded-2xl">
                    <svg xmlns="http://www.w3.org/http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                        <path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3"/>
                        <path d="M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3"/>
                        <rect width="20" height="8" x="2" y="8" rx="2"/>
                        <path d="M6 12h.01"/>
                        <path d="M10 12h.01"/>
                    </svg>
                </div>
                <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none text-emerald-500 font-bold">
                    -&gt;
                </span>
            </div>

            <h2 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
                Sandboxes
            </h2>
            <p className="mb-6 mt-0 text-foreground/60 leading-relaxed group-hover:text-foreground/80 transition-colors">
                Active isolated environments for development and safe operations.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col overflow-hidden">
                    <span className="text-2xl font-bold text-foreground truncate" title={latestSandbox?.name || "No Active"}>
                        {latestSandbox ? latestSandbox.name : "None"}
                    </span>
                    <span className="text-xs uppercase tracking-wider text-foreground/50 font-semibold mt-1">
                        {latestSandbox ? `${latestSandbox.repoIds?.length || 0} Repos Mounted` : "No Active Sandboxes"}
                    </span>
                </div>
                <div className="flex gap-4 items-center justify-end">
                    <div className="flex flex-col items-end">
                        <span className="text-2xl font-bold text-foreground">{activeCount}</span>
                        <span className="text-xs uppercase tracking-wider text-foreground/50 font-semibold mt-1 text-right">Running</span>
                    </div>
                    {latestSandbox && (
                        <button
                            onClick={(e) => handleStop(e, latestSandbox.id)}
                            disabled={isActionLoading}
                            className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-20 translate-y-1"
                            title="Stop Sandbox"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/><rect width="6" height="6" x="9" y="9"/>
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </Link>
    );
}
