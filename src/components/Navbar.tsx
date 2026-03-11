import React from "react";
import Link from "next/link";
import { UserProfileDropdown } from "./UserProfileDropdown";
import { AdminDropdown } from "./AdminDropdown";
import { config } from '@/config';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

export const Navbar = async () => {
    const session = await getServerSession(authOptions);

    return (
        <nav className="sticky top-0 z-40 w-full border-b border-border bg-background">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                            <span className="text-white font-bold">A</span>
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                            {config.app.name}
                        </span>
                    </Link>

                    {session?.user && (
                        <div className="hidden md:flex items-center gap-6">
                            <Link href="/dashboard" className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">
                                Dashboard
                            </Link>
                            <Link href="/workspace" className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">
                                Workspaces
                            </Link>
                            <Link href="/docs-chat" className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">
                                Knowledge Base
                            </Link>
                            <Link href="/code-search" className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">
                                Code Search
                            </Link>
                            <AdminDropdown />
                        </div>
                    )}

                </div>

                <div className="flex items-center gap-4">
                    {session?.user ? (
                        <UserProfileDropdown user={session.user} />
                    ) : (
                        <div className="flex items-center space-x-4">
                            <Link href="/login" className="text-sm font-medium text-foreground/80 hover:text-foreground">
                                Log in
                            </Link>
                            <Link href="/register" className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                                Sign up
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};
