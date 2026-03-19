"use client";

import React, { useState, useEffect } from "react";

interface Connection {
    id: string;
    name: string;
    enabled: boolean;
    type: string;
    config: string;
    agentId: string | null;
    tokenLimitDaily: number | null;
    tokensUsedToday: number;
    metadata: string | null;
}

interface Agent {
    id: string;
    name: string;
}

interface ConnectionsClientProps {
    initialConnections: Connection[];
    initialAgents: Agent[];
}

export default function ConnectionsClient({ initialConnections, initialAgents }: ConnectionsClientProps) {
    const [connections, setConnections] = useState<Connection[]>(initialConnections);
    const [agents] = useState<Agent[]>(initialAgents);
    const [selectedAgentId, setSelectedAgentId] = useState<string>("");
    const [addingType, setAddingType] = useState<string | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [discordToken, setDiscordToken] = useState("");
    const [botName, setBotName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [tokenLimitDaily, setTokenLimitDaily] = useState<string>("");
    const [metadata, setMetadata] = useState<{ channels: Record<string, { name: string; enabled: boolean }> }>({ channels: {} });
    const [isLoading, setIsLoading] = useState(false);
    const [initialData, setInitialData] = useState<{
        name: string;
        agentId: string;
        token: string;
        tokenLimitDaily: string;
        metadata: string;
    } | null>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const [newChannelId, setNewChannelId] = useState("");
    const [newChannelName, setNewChannelName] = useState("");

    const addChannelOverride = () => {
        if (!newChannelId.trim()) return;
        setMetadata(prev => ({
            ...prev,
            channels: {
                ...prev.channels,
                [newChannelId.trim()]: { name: newChannelName.trim() || `Channel ${newChannelId}`, enabled: true }
            }
        }));
        setNewChannelId("");
        setNewChannelName("");
    };

    const toggleChannelOverride = (id: string) => {
        setMetadata(prev => ({
            ...prev,
            channels: {
                ...prev.channels,
                [id]: { ...prev.channels[id], enabled: !prev.channels[id].enabled }
            }
        }));
    };

    const removeChannelOverride = (id: string) => {
        setMetadata(prev => {
            const next = { ...prev.channels };
            delete next[id];
            return { ...prev, channels: next };
        });
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchConnections = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/connections");
            const data = await res.json();
            setConnections(data);
        } catch (err) {
            console.error("Failed to fetch connections:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddClick = (type: string) => {
        setAddingType(type);
        setEditingId(null);
        setDiscordToken("");
        setBotName("");
        setSelectedAgentId("");
        setTokenLimitDaily("");
        setMetadata({ channels: {} });
        setInitialData(null);
        setIsDropdownOpen(false);
    };

    const handleEditClick = (conn: Connection) => {
        setAddingType(conn.type);
        setEditingId(conn.id);
        setBotName(conn.name);
        setSelectedAgentId(conn.agentId || "");
        setTokenLimitDaily(conn.tokenLimitDaily?.toString() || "");
        try {
            setMetadata(conn.metadata ? JSON.parse(conn.metadata) : { channels: {} });
        } catch {
            setMetadata({ channels: {} });
        }
        try {
            const config = JSON.parse(conn.config);
            const token = config.token || "";
            setDiscordToken(token);

            setInitialData({
                name: conn.name,
                agentId: conn.agentId || "",
                token: token,
                tokenLimitDaily: conn.tokenLimitDaily?.toString() || "",
                metadata: conn.metadata || JSON.stringify({ channels: {} })
            });
        } catch {
            setDiscordToken("");
            setInitialData(null);
        }
    };

    const handleSaveConnection = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const body = {
                type: "discord",
                name: botName,
                config: JSON.stringify({ token: discordToken }),
                agentId: selectedAgentId || null,
                tokenLimitDaily: tokenLimitDaily === "" ? null : parseInt(tokenLimitDaily),
                metadata: JSON.stringify(metadata)
            };

            if (editingId) {
                await fetch(`/api/connections/${editingId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                });
            } else {
                await fetch("/api/connections", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                });
            }

            setAddingType(null);
            setEditingId(null);
            setDiscordToken("");
            setBotName("");
            setTokenLimitDaily("");
            setMetadata({ channels: {} });
            setInitialData(null);
            fetchConnections();
        } catch (err) {
            console.error("Failed to save connection:", err);
        }
    };

    const deleteConnection = async (id: string) => {
        if (!confirm("Are you sure you want to delete this connection?")) return;
        try {
            await fetch(`/api/connections/${id}`, {
                method: "DELETE"
            });
            fetchConnections();
        } catch (err) {
            console.error("Failed to delete connection:", err);
        }
    };

    const toggleConnection = async (id: string, enabled: boolean) => {
        try {
            await fetch(`/api/connections/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled: !enabled })
            });
            fetchConnections();
        } catch (err) {
            console.error("Failed to toggle connection:", err);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold mb-2">External Connections</h1>
                    <p className="text-foreground/60">Manage your agent connections to apps like Discord and Slack.</p>
                </div>
                {!addingType && (
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 font-semibold shadow-lg shadow-primary/20"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Connection
                            <svg className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-background border border-border rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <button
                                    onClick={() => handleAddClick("discord")}
                                    className="w-full text-left px-4 py-3 hover:bg-foreground/5 transition-colors flex items-center gap-3"
                                >
                                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                                        </svg>
                                    </div>
                                    <span className="font-medium text-sm">Discord Bot</span>
                                </button>
                                <button
                                    disabled
                                    className="w-full text-left px-4 py-3 opacity-50 cursor-not-allowed flex items-center gap-3"
                                >
                                    <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-500">
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M6 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm4 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0-8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm4 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm4-4a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                                        </svg>
                                    </div>
                                    <span className="font-medium text-sm italic">Slack (Coming Soon)</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {addingType === "discord" && (
                <div className="glass border border-border/50 rounded-2xl p-6 mb-8 animate-in slide-in-from-top-4 duration-300">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                            </svg>
                        </div>
                        {editingId ? "Edit Connection" : "New Discord Connection"}
                    </h2>
                    <form onSubmit={handleSaveConnection} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Friendly Name</label>
                            <input
                                type="text"
                                value={botName}
                                onChange={(e) => setBotName(e.target.value)}
                                placeholder="My Personal Discord Bot"
                                className="w-full bg-foreground/5 border border-border/50 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Assigned Agent</label>
                            <select
                                value={selectedAgentId}
                                onChange={(e) => setSelectedAgentId(e.target.value)}
                                className="w-full bg-foreground/5 border border-border/50 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                            >
                                <option value="">No Agent (Will use first available)</option>
                                {agents.map(agent => (
                                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Bot Token</label>
                            <input
                                type="password"
                                value={discordToken}
                                onChange={(e) => setDiscordToken(e.target.value)}
                                placeholder="MTAx..."
                                className="w-full bg-foreground/5 border border-border/50 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                required
                            />
                        </div>

                        <div className="pt-4 border-t border-border/50">
                            <h3 className="text-sm font-bold mb-3">Discord Advanced Settings</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-foreground/60 mb-1 caps tracking-wider">Daily Token Limit</label>
                                    <input
                                        type="number"
                                        value={tokenLimitDaily}
                                        onChange={(e) => setTokenLimitDaily(e.target.value)}
                                        placeholder="Unlimited (Leave empty)"
                                        className="w-full bg-foreground/5 border border-border/50 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                    <p className="text-[10px] text-foreground/40 mt-1">Maximum tokens the bot can use per day for this connection.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-foreground/60 mb-2 caps tracking-wider">Authorized Channels (Whitelist)</label>
                                    <div className="space-y-2 mb-3">
                                        {Object.entries(metadata.channels || {}).map(([id, config]) => (
                                            <div key={id} className="flex items-center justify-between p-2 rounded-lg bg-foreground/5 border border-border/30">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleChannelOverride(id)}
                                                        className={`w-8 h-4 rounded-full relative transition-colors ${config.enabled ? 'bg-primary' : 'bg-gray-400'}`}
                                                    >
                                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${config.enabled ? 'left-4.5' : 'left-0.5'}`} />
                                                    </button>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">{config.name}</span>
                                                        <span className="text-[10px] text-foreground/40 font-mono">{id}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeChannelOverride(id)}
                                                    className="p-1.5 hover:bg-red-500/10 text-foreground/40 hover:text-red-500 rounded-md transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newChannelId}
                                            onChange={(e) => setNewChannelId(e.target.value)}
                                            placeholder="ID, Name, or Pattern (e.g. general-*)"
                                            className="flex-1 bg-foreground/5 border border-border/50 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                        <input
                                            type="text"
                                            value={newChannelName}
                                            onChange={(e) => setNewChannelName(e.target.value)}
                                            placeholder="Label (optional)"
                                            className="flex-1 bg-foreground/5 border border-border/50 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                        <button
                                            type="button"
                                            onClick={addChannelOverride}
                                            className="px-3 py-1.5 bg-foreground/10 hover:bg-foreground/20 rounded-xl text-xs font-bold transition-colors"
                                        >
                                            Authorize
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-foreground/40 mt-2 italic">Strict Whitelist: The bot only responds in these channels. You can use IDs, exact names, or wildcards like <code>logs-*</code>.</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => setAddingType(null)}
                                className="px-4 py-2 text-sm font-medium hover:bg-foreground/5 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={editingId !== null && (
                                    initialData?.name === botName &&
                                    initialData?.agentId === selectedAgentId &&
                                    initialData?.token === discordToken &&
                                    initialData?.tokenLimitDaily === tokenLimitDaily &&
                                    initialData?.metadata === JSON.stringify(metadata)
                                )}
                                className="px-4 py-2 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                {editingId ? "Update Connection" : "Save Connection"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                {isLoading ? (
                    <div className="text-center py-12 text-foreground/40 animate-pulse">Loading connections...</div>
                ) : connections.length === 0 ? (
                    <div className="text-center py-12 glass border border-border/50 rounded-2xl italic text-foreground/40">
                        No connections configured yet.
                    </div>
                ) : (
                    connections.map((conn) => (
                        <div key={conn.id} className="glass border border-border/50 rounded-2xl p-6 flex items-center justify-between group hover:border-primary/20 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{conn.name}</h3>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${conn.enabled ? "bg-green-500" : "bg-foreground/20"}`} />
                                            <span className="text-xs text-foreground/60">{conn.enabled ? "Active" : "Disabled"}</span>
                                        </div>
                                        <div className="w-1 h-1 rounded-full bg-foreground/20" />
                                        <div className="text-xs text-foreground/60 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            {conn.agentId ? agents.find(a => a.id === conn.agentId)?.name || "Unknown Agent" : "No Agent Assigned"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 max-w-[200px] mx-8 flex flex-col gap-1.5">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Daily Usage</span>
                                    <span className="text-[10px] font-mono text-foreground/60">
                                        {conn.tokensUsedToday.toLocaleString()}
                                        {conn.tokenLimitDaily ? ` / ${conn.tokenLimitDaily.toLocaleString()}` : ' tokens'}
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-foreground/5 rounded-full overflow-hidden border border-border/20">
                                    <div 
                                        className={`h-full transition-all duration-500 ${
                                            !conn.tokenLimitDaily ? 'bg-primary/40' :
                                            (conn.tokensUsedToday / conn.tokenLimitDaily) > 0.9 ? 'bg-red-500' :
                                            (conn.tokensUsedToday / conn.tokenLimitDaily) > 0.7 ? 'bg-amber-500' :
                                            'bg-primary'
                                        }`}
                                        style={{ 
                                            width: !conn.tokenLimitDaily 
                                                ? '100%' 
                                                : `${Math.min(100, (conn.tokensUsedToday / conn.tokenLimitDaily) * 100)}%` 
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleEditClick(conn)}
                                    className="p-2 hover:bg-foreground/5 rounded-lg text-foreground/40 hover:text-primary transition-colors"
                                    title="Edit Settings"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => deleteConnection(conn.id)}
                                    className="p-2 hover:bg-foreground/5 rounded-lg text-foreground/40 hover:text-red-500 transition-colors"
                                    title="Delete Connection"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                                <div className="w-px h-6 bg-border/50 mx-1" />
                                <button
                                    onClick={() => toggleConnection(conn.id, conn.enabled)}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${conn.enabled
                                        ? "bg-foreground/5 hover:bg-red-500/10 hover:text-red-500"
                                        : "bg-primary text-white"
                                        }`}
                                >
                                    {conn.enabled ? "Disable" : "Enable"}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
