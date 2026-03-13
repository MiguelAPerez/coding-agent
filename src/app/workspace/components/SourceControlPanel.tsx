import React from "react";
import GitLog from "./GitLog";

interface SourceControlPanelProps {
    selectedRepoId: string | null;
    selectedBranch: string;
    commitMessage: string;
    setCommitMessage: (msg: string) => void;
    isCommitting: boolean;
    isPushing: boolean;
    isMainProtected: boolean;
    handleCommit: () => void;
    handlePush: () => void;
    gitRefreshKey: number;
}

const SourceControlPanel: React.FC<SourceControlPanelProps> = ({
    selectedRepoId,
    selectedBranch,
    commitMessage,
    setCommitMessage,
    isCommitting,
    isPushing,
    isMainProtected,
    handleCommit,
    handlePush,
    gitRefreshKey,
}) => {
    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-2 border-b border-border bg-foreground/[0.03]">
                <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Source Control</span>
            </div>
            
            <div className="flex-1 flex flex-col overflow-hidden">
                {selectedRepoId ? (
                    <>
                        <div className="p-4 bg-background/50">
                            <div className="flex flex-col gap-3">
                                <textarea 
                                    value={commitMessage}
                                    onChange={(e) => setCommitMessage(e.target.value)}
                                    placeholder="Commit message..."
                                    className="w-full p-2.5 text-xs bg-foreground/5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px] resize-none transition-all placeholder:text-foreground/30"
                                />
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleCommit}
                                        disabled={isCommitting || !commitMessage.trim() || (isMainProtected && selectedBranch === "main")}
                                        className="flex-1 px-3 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
                                    >
                                        {isCommitting ? "Committing..." : (isMainProtected && selectedBranch === "main" ? "Branch Protected" : "Commit")}
                                    </button>
                                    <button 
                                        onClick={handlePush}
                                        disabled={isPushing || (isMainProtected && selectedBranch === "main")}
                                        className="px-3 py-2 text-xs font-bold bg-foreground/10 text-foreground rounded-lg hover:bg-foreground/20 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center gap-2"
                                        title="Push Changes"
                                    >
                                        {isPushing ? (
                                            <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                    <polyline points="17 8 12 3 7 8"></polyline>
                                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                                </svg>
                                                {isMainProtected && selectedBranch === "main" && "Push Protected"}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 px-4 pb-4 overflow-hidden flex flex-col">
                            <GitLog repoId={selectedRepoId} refreshTrigger={gitRefreshKey} />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center p-8 text-center text-foreground/40 text-xs italic">
                        Select a repository to view source control actions
                    </div>
                )}
            </div>
        </div>
    );
};

export default SourceControlPanel;
