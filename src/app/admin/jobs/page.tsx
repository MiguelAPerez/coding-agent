"use client";

import React, { useEffect, useState } from "react";
// Since I can't use drizzle directly in a client component for all queries,
// I'll need a server action to fetch the jobs.
import { getBackgroundJobs, triggerSemanticIndexing } from "@/app/actions/config";

interface Job {
    id: string;
    name: string;
    status: "running" | "completed" | "failed";
    startedAt: Date;
    completedAt: Date | null;
    error: string | null;
    details: string | null;
}

export default function JobsPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [triggering, setTriggering] = useState(false);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const data = await getBackgroundJobs();
            setJobs(data as Job[]);
        } catch (e) {
            console.error("Failed to fetch jobs", e);
        } finally {
            setLoading(false);
        }
    };

    const handleRunNow = async () => {
        setTriggering(true);
        try {
            await triggerSemanticIndexing();
            // Refresh quickly a couple of times to show it started
            setTimeout(fetchJobs, 500);
            setTimeout(fetchJobs, 2000);
        } catch (e) {
            console.error("Failed to trigger indexing", e);
        } finally {
            setTriggering(false);
        }
    };

    useEffect(() => {
        fetchJobs();
        const interval = setInterval(fetchJobs, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Background Jobs</h1>
                    <p className="text-foreground/50 text-sm">Monitor scheduled tasks and background processes.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleRunNow}
                        disabled={triggering}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        {triggering ? "Starting..." : "Run Indexing Now"}
                    </button>
                    <button 
                        onClick={fetchJobs}
                        className="px-4 py-2 rounded-lg bg-foreground/5 border border-border hover:bg-foreground/10 transition-colors text-sm font-medium"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            <div className="glass rounded-2xl border border-border overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-border bg-foreground/[0.02]">
                            <th className="px-6 py-4 font-semibold">Job Name</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold">Started</th>
                            <th className="px-6 py-4 font-semibold">Duration</th>
                            <th className="px-6 py-4 font-semibold">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {jobs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-foreground/40 text-sm">
                                    {loading ? "Loading jobs..." : "No background jobs found."}
                                </td>
                            </tr>
                        ) : (
                            jobs.map((job) => (
                                <tr key={job.id} className="hover:bg-foreground/[0.01] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-foreground">{job.name}</div>
                                        <div className="text-[10px] font-mono text-foreground/30 mt-0.5">{job.id}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                            job.status === "running" ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" :
                                            job.status === "completed" ? "bg-green-500/10 text-green-500 border border-green-500/20" :
                                            "bg-red-500/10 text-red-500 border border-red-500/20"
                                        }`}>
                                            {job.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-foreground/60">
                                        {new Date(job.startedAt).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-foreground/60">
                                        {job.completedAt 
                                            ? `${((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000).toFixed(1)}s`
                                            : "—"
                                        }
                                    </td>
                                    <td className="px-6 py-4">
                                        {job.error ? (
                                            <span className="text-red-400 text-xs italic">{job.error}</span>
                                        ) : (
                                            <span className="text-foreground/40 text-xs font-mono">{job.details || "—"}</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
