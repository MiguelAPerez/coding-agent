"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ConnectionsSettingsPage() {
    const router = useRouter();
    const sessionContext = useSession();
    const session = sessionContext?.data;
    const [connections, setConnections] = useState<{ id: string; name: string; enabled: boolean; type: string; config: string }[]>([]);
    const [addingType, setAddingType] = useState<string | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [discordToken, setDiscordToken] = useState("");
    const [botName, setBotName] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
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

    useEffect(() => {
        if (sessionContext?.status === "unauthenticated") {
            router.push("/login");
        } else if (session) {
            fetchConnections();
        }
    }, [session, sessionContext?.status, router]);

    const handleAddClick = (type: string) => {
        setAddingType(type);
        setIsDropdownOpen(false);
    };

    const handleSaveConnection = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/connections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "discord",
                    name: botName,
                    config: JSON.stringify({ token: discordToken })
                })
            });
            if (res.ok) {
                setAddingType(null);
                setDiscordToken("");
                setBotName("");
                fetchConnections();
            }
        } catch (err) {
            console.error("Failed to save connection:", err);
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
                                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
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
                                            <path d="M6 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm4 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0-8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm4 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm4-4a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
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
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                            </svg>
                        </div>
                        New Discord Connection
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
                                className="px-4 py-2 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
                            >
                                Save Connection
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
                                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{conn.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${conn.enabled ? "bg-green-500" : "bg-foreground/20"}`} />
                                        <span className="text-xs text-foreground/60">{conn.enabled ? "Active" : "Disabled"}</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => toggleConnection(conn.id, conn.enabled)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                                    conn.enabled 
                                        ? "bg-foreground/5 hover:bg-red-500/10 hover:text-red-500" 
                                        : "bg-primary text-white"
                                }`}
                            >
                                {conn.enabled ? "Disable" : "Enable"}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
