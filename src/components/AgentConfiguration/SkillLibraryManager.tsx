import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Skill } from "@/types/agent";
import { getSkills, deleteSkill, syncSystemSkills, importSkillFromRepo } from "@/app/actions/skills";
import { SkillCard } from "./SkillCard";
import { SkillImportForm } from "./SkillImportForm";
import { SkillEditor } from "./SkillEditor";

export default function SkillLibraryManager() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const [skills, setSkills] = useState<Skill[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const isEditing = searchParams.get("edit");
    const [isImporting, setIsImporting] = useState(false);
    const [repoUrl, setRepoUrl] = useState("");
    const [filter, setFilter] = useState<'all' | 'system' | 'user'>('all');

    const load = useCallback(async () => {
        setIsLoading(true);
        const data = await getSkills();
        setSkills(data);
        setIsLoading(false);
    }, []);

    useEffect(() => { 
        let isMounted = true;
        getSkills().then(data => {
            if (isMounted) {
                setSkills(data);
                setIsLoading(false);
            }
        });
        return () => { isMounted = false; };
    }, []);

    const setEditParam = useCallback((id: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (id !== null) {
            params.set("edit", id);
        } else {
            params.delete("edit");
        }
        router.push(`${pathname}?${params.toString()}`);
    }, [router, pathname, searchParams]);

    const startNew = () => {
        setEditParam("new");
    };

    const startEdit = (skill: Skill) => {
        setEditParam(skill.id);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this skill?")) {
            await deleteSkill(id);
            load();
        }
    };

    const handleSync = async () => {
        await syncSystemSkills();
        load();
    };

    const handleImport = async () => {
        setIsImporting(true);
        try {
            await importSkillFromRepo(repoUrl);
            setRepoUrl("");
            setIsImporting(false);
            load();
        } catch {
            setIsImporting(false);
            alert("Import failed");
        }
    };

    const filteredSkills = skills.filter(s => {
        if (filter === 'system') return s.isManaged;
        if (filter === 'user') return !s.isManaged;
        return true;
    });

    return (
        <div className="max-w-7xl mx-auto p-8 animate-in fade-in duration-700">
            <header className="flex justify-between items-center mb-12">
                <div>
                    <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/40 bg-clip-text text-transparent mb-2 italic">
                        SKILL LIBRARY
                    </h1>
                    <p className="text-sm text-foreground/40 font-medium">Manage shared capabilities for your agents</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={handleSync}
                        className="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-border hover:bg-foreground/5 transition-all text-foreground/40 hover:text-foreground"
                    >
                        Sync System
                    </button>
                    <button
                        onClick={() => setIsImporting(true)}
                        className="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-border hover:bg-foreground/5 transition-all text-foreground/40 hover:text-foreground"
                    >
                        Import Repo
                    </button>
                    <button
                        onClick={startNew}
                        className="px-8 py-2 bg-foreground text-background rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 shadow-2xl shadow-foreground/10 transition-all scale-100 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Create Skill
                    </button>
                </div>
            </header>

            {isImporting && (
                <SkillImportForm 
                    repoUrl={repoUrl} 
                    setRepoUrl={setRepoUrl} 
                    isImporting={isImporting} 
                    onImport={handleImport} 
                    onCancel={() => setIsImporting(false)} 
                />
            )}

            <div className="flex items-center gap-2 mb-8 p-1 bg-foreground/5 w-fit rounded-xl border border-border/50">
                {(['all', 'system', 'user'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                            filter === f ? 'bg-background text-foreground shadow-sm' : 'text-foreground/40 hover:text-foreground/60'
                        }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-50">
                    {[1, 2, 3].map(i => <div key={i} className="h-48 glass rounded-3xl animate-pulse" />)}
                </div>
            ) : filteredSkills.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSkills.map(skill => (
                        <SkillCard 
                            key={skill.id} 
                            skill={skill} 
                            onEdit={startEdit} 
                            onDelete={handleDelete} 
                        />
                    ))}
                </div>
            ) : (
                <div className="glass p-20 rounded-[3rem] border-2 border-dashed border-border/50 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-6">
                        <i className="ri-flask-line text-3xl text-primary/40"></i>
                    </div>
                    <h2 className="text-xl font-bold mb-2">No skills found</h2>
                    <p className="text-foreground/40 max-w-sm mb-8">
                        Skills are entry-point scripts your agents can execute to perform specific tasks. Create one or import from a repository.
                    </p>
                </div>
            )}

            {isEditing !== null && (
                <SkillEditor 
                    key={isEditing}
                    isNew={isEditing === "new"}
                    skill={isEditing === "new" ? null : skills.find(s => s.id === isEditing) || null}
                    onComplete={() => {
                        setEditParam(null);
                        load();
                    }}
                    onCancel={() => setEditParam(null)}
                />
            )}
        </div>
    );
}
