"use client";

import React from "react";

interface SkillImportFormProps {
    repoUrl: string;
    setRepoUrl: (url: string) => void;
    isImporting: boolean;
    onImport: () => void;
    onCancel: () => void;
}

export const SkillImportForm: React.FC<SkillImportFormProps> = ({ 
    repoUrl, 
    setRepoUrl, 
    isImporting, 
    onImport, 
    onCancel 
}) => {
    return (
        <div className="glass p-6 rounded-3xl border-2 border-primary/20 bg-background/80 backdrop-blur-xl mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-4">Import Skill from Repository</h3>
            <div className="flex gap-4">
                <input
                    className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="https://github.com/user/my-skill.git"
                    value={repoUrl}
                    onChange={e => setRepoUrl(e.target.value)}
                    disabled={isImporting}
                />
                <div className="flex gap-2">
                    <button
                        disabled={isImporting}
                        onClick={onCancel}
                        className="px-4 py-2 text-sm text-foreground/60 hover:text-foreground font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={isImporting || !repoUrl}
                        onClick={onImport}
                        className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-2"
                    >
                        {isImporting ? (
                            <><i className="ri-loader-4-line animate-spin"></i> Importing...</>
                        ) : (
                            <>Import</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
