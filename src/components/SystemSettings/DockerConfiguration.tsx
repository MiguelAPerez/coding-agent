"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getDockerStatus, buildGitDockerImage } from "@/app/actions/docker-mgmt";
import { createSandbox, listSandboxes, stopSandbox, updateSandbox, SandboxInfo } from "@/app/actions/docker-sandboxes";
import { getEnabledRepositories } from "@/app/actions/workspace";

export default function DockerConfiguration() {
    const [status, setStatus] = useState<{
        dockerRunning: boolean;
        imageBuilt: boolean;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isBuilding, setIsBuilding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [buildOutput, setBuildOutput] = useState<string | null>(null);

    // Sandbox state
    const [sandboxes, setSandboxes] = useState<SandboxInfo[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newSandboxName, setNewSandboxName] = useState("");
    const [selectedRepoIds, setSelectedRepoIds] = useState<string[]>([]);
    const [availableRepos, setAvailableRepos] = useState<{ id: string; name: string }[]>([]);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const refreshStatus = useCallback(async () => {
        try {
            const [currentStatus, currentSandboxes, repos] = await Promise.all([
                getDockerStatus(),
                listSandboxes(),
                getEnabledRepositories()
            ]);
            setStatus(currentStatus);
            setSandboxes(currentSandboxes);
            setAvailableRepos(repos);
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

    const handleSaveSandbox = async () => {
        if (!newSandboxName || selectedRepoIds.length === 0) return;
        setIsActionLoading(true);
        setError(null);

        try {
            let result;
            if (editingId) {
                result = await updateSandbox(editingId, newSandboxName, selectedRepoIds);
            } else {
                result = await createSandbox(newSandboxName, selectedRepoIds);
            }

            if (result.success) {
                resetForm();
                refreshStatus();
            }
        } catch (err: unknown) {
            const error = err as Error;
            setError(error.message || "Failed to save sandbox.");
        } finally {
            setIsActionLoading(false);
        }
    };

    const resetForm = () => {
        setNewSandboxName("");
        setSelectedRepoIds([]);
        setEditingId(null);
        setIsCreating(false);
    };

    const handleEditSandbox = (sandbox: SandboxInfo) => {
        setNewSandboxName(sandbox.name);
        setSelectedRepoIds(sandbox.repoIds || []);
        setEditingId(sandbox.id);
        setIsCreating(true);
    };

    const handleStopSandbox = async (id: string) => {
        setIsActionLoading(true);
        try {
            await stopSandbox(id);
            refreshStatus();
        } catch (err: unknown) {
            const error = err as Error;
            setError(error.message || "Failed to stop sandbox.");
        } finally {
            setIsActionLoading(false);
        }
    };

    const toggleRepo = (id: string) => {
        setSelectedRepoIds((prev: string[]) => 
            prev.includes(id) ? prev.filter((i: string) => i !== id) : [...prev, id]
        );
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
                Sandboxed Git execution environment using Docker containers for safe operations and persistent development.
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

                {/* Sandbox Management Section */}
                <div className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-md font-semibold font-mono uppercase tracking-wider text-foreground/40">Active Sandboxes</h3>
                        {isReady && !isCreating && (
                            <button 
                                onClick={() => setIsCreating(true)}
                                className="text-xs px-3 py-1 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-all border border-primary/20"
                            >
                                + New Sandbox
                            </button>
                        )}
                    </div>

                    {isCreating ? (
                        <div className="p-4 rounded-xl bg-background/50 border border-primary/30 space-y-4 animate-in fade-in slide-in-from-top-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-foreground/40 mb-2">Sandbox Name</label>
                                <input 
                                    type="text" 
                                    value={newSandboxName}
                                    onChange={(e) => setNewSandboxName(e.target.value)}
                                    placeholder="e.g. My-Project-Sandbox"
                                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-foreground/40 mb-2">Mount Repositories</label>
                                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-foreground/5 rounded-lg border border-border">
                                    {availableRepos.length > 0 ? availableRepos.map((repo: { id: string; name: string }) => (
                                        <button
                                            key={repo.id}
                                            onClick={() => toggleRepo(repo.id)}
                                            className={`text-[10px] px-2 py-1 rounded border transition-all ${
                                                selectedRepoIds.includes(repo.id) 
                                                ? 'bg-primary/20 border-primary text-primary' 
                                                : 'bg-background border-border text-foreground/50'
                                            }`}
                                        >
                                            {repo.name}
                                        </button>
                                    )) : (
                                        <p className="text-[10px] text-foreground/30 px-2 py-1 italic">No enabled repositories found.</p>
                                    )}
                                </div>
                                <p className="text-[10px] text-foreground/30 mt-2 px-1">
                                    {editingId ? "Updating repositories will recreate the sandbox container." : "Selected projects will be mounted to /workspace."}
                                </p>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button 
                                    onClick={resetForm}
                                    className="px-3 py-1.5 text-xs text-foreground/60 hover:text-foreground"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveSandbox}
                                    disabled={!newSandboxName || selectedRepoIds.length === 0 || isActionLoading}
                                    className="px-4 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
                                >
                                    {editingId ? "Update Sandbox" : "Start Sandbox"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {sandboxes.length > 0 ? sandboxes.map(sandbox => (
                                <div key={sandbox.id} className="flex items-center justify-between p-3 bg-foreground/5 rounded-lg border border-border/50 group">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{sandbox.name}</span>
                                        <span className="text-[10px] text-foreground/40 font-mono">{sandbox.status} • {sandbox.repoIds?.length || 0} repos mounted</span>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        <button 
                                            onClick={() => handleEditSandbox(sandbox)}
                                            disabled={isActionLoading}
                                            className="text-xs text-primary/70 hover:text-primary hover:bg-primary/10 px-2 py-1 rounded disabled:opacity-20 transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            onClick={() => handleStopSandbox(sandbox.id)}
                                            disabled={isActionLoading}
                                            className="text-xs text-red-500/50 hover:text-red-500 hover:bg-red-500/10 px-2 py-1 rounded disabled:opacity-20 transition-colors"
                                        >
                                            Stop
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-8 bg-foreground/5 rounded-xl border border-dashed border-border">
                                    <p className="text-xs text-foreground/40 italic">No active sandboxes. Create one to start containerized development.</p>
                                </div>
                            )}
                        </div>
                    )}
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
