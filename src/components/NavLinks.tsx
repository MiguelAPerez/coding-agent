"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Chat", href: "/chat" },
    { label: "Workspaces", href: "/workspace" },
    { label: "Knowledge Base", href: "/docs-chat" },
    { label: "Code Search", href: "/code-search", shortcut: "⌘K" },
];

export const NavLinks = () => {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                router.push("/code-search");
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [router]);

    return (
        <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`text-sm font-medium transition-colors relative py-1 flex items-center gap-2 ${
                            isActive
                                ? "text-foreground"
                                : "text-foreground/60 hover:text-foreground"
                        }`}
                    >
                        {item.label}
                        {item.shortcut && (
                            <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-foreground/5 px-1.5 font-sans text-[11px] font-medium text-foreground/40 transition-colors">
                                <span className="flex items-center h-full text-[12px] translate-y-[-0.5px]">⌘</span>
                                <span className="flex items-center h-full">K</span>
                            </kbd>
                        )}
                        {isActive && (
                            <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-primary rounded-full animate-in fade-in zoom-in duration-300" />
                        )}
                    </Link>
                );
            })}
        </div>
    );
};
