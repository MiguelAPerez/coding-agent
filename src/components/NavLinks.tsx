"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Workspaces", href: "/workspace" },
    { label: "Knowledge Base", href: "/docs-chat" },
    { label: "Code Search", href: "/code-search" },
];

export const NavLinks = () => {
    const pathname = usePathname();

    return (
        <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`text-sm font-medium transition-colors relative py-1 ${
                            isActive
                                ? "text-foreground"
                                : "text-foreground/60 hover:text-foreground"
                        }`}
                    >
                        {item.label}
                        {isActive && (
                            <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-primary rounded-full animate-in fade-in zoom-in duration-300" />
                        )}
                    </Link>
                );
            })}
        </div>
    );
};
