"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import Link from "next/link"
import { registerUser } from "@/app/actions/auth"

export default function RegisterPage() {
    const router = useRouter()
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [loadingStatus, setLoadingStatus] = useState("")

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        const formData = new FormData(e.currentTarget)

        // Quick validation
        if (formData.get("password") !== formData.get("confirmPassword")) {
            setError("Passwords do not match")
            setLoading(false)
            return
        }

        try {
            setLoadingStatus("Creating account...")
            const res = await registerUser(formData)

            if (res.error) {
                setError(res.error)
            } else {
                setLoadingStatus("Setting up workspace...")
                // Small delay to show the status change clearly
                await new Promise(r => setTimeout(r, 800));
                setLoadingStatus("Almost ready...")
                await new Promise(r => setTimeout(r, 500));
                // Success! Redirect to login
                router.push("/login?registered=true")
            }
        } catch (err) {
            console.error(err)
            setError("An unexpected error occurred")
        } finally {
            setLoading(false)
            setLoadingStatus("")
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
            <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 m-4">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Account</h1>
                    <p className="text-gray-500 dark:text-gray-400">Join us to start your journey</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-sm transition-all">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Full Name
                        </label>
                        <input
                            name="name"
                            type="text"
                            required
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                            placeholder="John Doe"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Username
                        </label>
                        <input
                            name="username"
                            type="text"
                            required
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                            placeholder="johndoe123"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Email Address
                        </label>
                        <input
                            name="email"
                            type="email"
                            required
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Password
                        </label>
                        <input
                            name="password"
                            type="password"
                            required
                            minLength={6}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Confirm Password
                        </label>
                        <input
                            name="confirmPassword"
                            type="password"
                            required
                            minLength={6}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg transition-all duration-200 focus:ring-4 focus:ring-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center transform hover:-translate-y-0.5"
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>{loadingStatus}</span>
                            </div>
                        ) : (
                            "Sign Up"
                        )}
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    Already have an account?{" "}
                    <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    )
}
