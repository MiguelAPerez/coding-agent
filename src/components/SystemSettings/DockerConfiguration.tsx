"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getDockerStatus, buildGitDockerImage } from "@/app/actions/docker-mgmt";

export default function DockerConfiguration() {
    const [status, setStatus] = useState<{
        dockerRunning: boolean;
        imageBuilt: boolean;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isBuilding, setIsBuilding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [buildOutput, setBuildOutput] = useState<string | null>(null);

    const refreshStatus = useCallback(async () => {
        try {
            const currentStatus = await getDockerStatus();
            setStatus(currentStatus);
        } catch (err) {
            console.error("Failed to load Docker status", err);
            setError("Failed to connect to backend for Docker status.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshStatus();
    }, [refreshStatus]);

    const handleBuild = async () => {
        setIsBuilding(true);
        setError(null);
        setBuildOutput(null);

        try {
            const result = await buildGitDockerImage();
            if (result.success) {
                setBuildOutput(result.output || "Build successful!");
                refreshStatus();
            } else {
                setError(result.error || "Failed to build Docker image.");
            }
        } catch (err) {
            console.error("Error during build process", err);
            setError("An error occurred while building the Docker image.");
        } finally {
            setIsBuilding(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 rounded-xl bg-foreground/5 border border-border animate-pulse">
                <div className="h-6 w-48 bg-foreground/10 rounded mb-4" />
                <div className="h-4 w-full bg-foreground/10 rounded mb-2" />
                <div className="h-4 w-2/3 bg-foreground/10 rounded" />
            </div>
        );
    }

    const isReady = status?.dockerRunning && status?.imageBuilt;

    return (
        <div className="p-6 rounded-xl bg-foreground/5 border border-border">
            <div className="flex justify-between items-start mb-2">
                <h2 className="text-lg font-semibold">Docker Git Sandbox</h2>
                {isReady && (
                    <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Ready
                    </div>
                )}
            </div>
            <p className="text-sm text-foreground/60 mb-6">
                Sandboxed Git execution environment using Docker containers for safe commit and push operations.
            </p>

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    {error}
                </div>
            )}

            <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <div>
                        <p className="text-sm font-medium">Docker Engine</p>
                        <p className="text-xs text-foreground/40">Required to run git containers</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status?.dockerRunning ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="text-xs font-medium">{status?.dockerRunning ? "Running" : "Not Found"}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <div>
                        <p className="text-sm font-medium">Git Image (coding-agent-git)</p>
                        <p className="text-xs text-foreground/40">The isolated Ubuntu environment</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status?.imageBuilt ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span className="text-xs font-medium">{status?.imageBuilt ? "Built" : "Missing"}</span>
                    </div>
                </div>

                {buildOutput && (
                    <div className="p-3 bg-black/20 rounded-lg border border-border/50 mt-4 overflow-hidden">
                        <p className="text-[10px] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto text-foreground/50">
                            {buildOutput}
                        </p>
                    </div>
                )}

                <div className="pt-4 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={refreshStatus}
                        className="px-4 py-2 bg-foreground/5 text-foreground/80 rounded-lg font-medium hover:bg-foreground/10 transition-all duration-200"
                    >
                        Refresh
                    </button>
                    <button
                        type="button"
                        onClick={handleBuild}
                        disabled={isBuilding || !status?.dockerRunning}
                        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
                    >
                        {isBuilding ? "Building Image..." : (status?.imageBuilt ? "Rebuild Image" : "Setup Git Sandbox")}
                    </button>
                </div>
            </div>
        </div>
    );
}
