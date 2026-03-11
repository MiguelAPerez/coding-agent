"use client";

import React, { useState } from "react";
import { FileNode } from "../WorkspaceClient";

interface FileTreeProps {
    tree: FileNode[];
    onSelectFile: (path: string) => void;
}

export default function FileTree({ tree, onSelectFile }: FileTreeProps) {
    if (!tree || tree.length === 0) {
        return <div className="p-4 text-sm text-foreground/50 italic">No files found.</div>;
    }

    return (
        <div className="h-full overflow-y-auto p-2">
            <div className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2 px-2">Explorer</div>
            {tree.map(node => (
                <TreeNode key={node.path} node={node} level={0} onSelectFile={onSelectFile} />
            ))}
        </div>
    );
}

function TreeNode({ node, level, onSelectFile }: { node: FileNode; level: number; onSelectFile: (path: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);

    const isDir = node.type === "directory";

    const handleClick = () => {
        if (isDir) {
            setIsOpen(!isOpen);
        } else {
            onSelectFile(node.path);
        }
    };

    return (
        <div>
            <div 
                className={`flex items-center gap-2 py-1 px-2 hover:bg-foreground/5 cursor-pointer rounded text-sm text-foreground/80 whitespace-nowrap overflow-hidden text-ellipsis`}
                style={{ paddingLeft: `${ level * 12 + 8 }px` }}
                onClick={handleClick}
            >
                <span className="opacity-50 text-xs w-4 inline-block text-center">
                    {isDir ? (isOpen ? "▾" : "▸") : "📄"}
                </span>
                <span className="truncate">{node.name}</span>
            </div>
            {isDir && isOpen && node.children && (
                <div>
                    {node.children.map(child => (
                        <TreeNode key={child.path} node={child} level={level + 1} onSelectFile={onSelectFile} />
                    ))}
                </div>
            )}
        </div>
    );
}
