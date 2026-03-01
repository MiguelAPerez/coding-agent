import React from "react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-24 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-purple-500/20 blur-[120px] pointer-events-none" />

      <div className="z-10 w-full max-w-5xl items-center justify-between font-sans text-sm lg:flex border-b border-white/5 pb-6 mb-16 animate-fade-in">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-white/10 bg-black/50 backdrop-blur-lg pb-6 pt-8 backdrop-blur-2xl lg:static lg:w-auto lg:rounded-2xl lg:border lg:bg-white/5 lg:p-4 transition-all hover:bg-white/10">
          Get started by editing&nbsp;
          <code className="font-mono font-bold text-primary">src/app/page.tsx</code>
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-black via-black/80 lg:static lg:h-auto lg:w-auto lg:bg-none">
          <a
            className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0 transition-opacity hover:opacity-80"
            href="https://nextjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            By{" "}
            <span className="font-bold text-xl tracking-tighter">Vercel</span>
          </a>
        </div>
      </div>

      <div className="relative flex flex-col place-items-center mb-24 animate-slide-up">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 text-center mb-6">
          Premium Next.js
        </h1>
        <p className="text-lg md:text-xl text-white/50 text-center max-w-2xl">
          A beautifully crafted starting point with Tailwind CSS, TypeScript, and rich aesthetics.
        </p>

        <div className="mt-10 flex gap-4">
          <button className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-blue-600 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20">
            Get Started
          </button>
          <button className="px-8 py-3 rounded-full glass hover:bg-white/10 transition-all hover:scale-105 active:scale-95">
            Documentation
          </button>
        </div>
      </div>

      <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left gap-6 animate-slide-up" style={{ animationDelay: "150ms" }}>
        {[
          { title: "Docs", href: "https://nextjs.org/docs", desc: "Find in-depth information about Next.js features and API." },
          { title: "Learn", href: "https://nextjs.org/learn", desc: "Learn about Next.js in an interactive course with quizzes!" },
          { title: "Templates", href: "https://vercel.com/templates?framework=next.js", desc: "Explore starter templates for Next.js." },
          { title: "Deploy", href: "https://vercel.com/new", desc: "Instantly deploy your Next.js site to a shareable URL." }
        ].map((item, i) => (
          <a
            key={i}
            href={item.href}
            className="group rounded-2xl glass p-6 transition-all hover:bg-white/5 hover:border-white/10 hover:-translate-y-1 block"
            target="_blank"
            rel="noopener noreferrer"
          >
            <h2 className="mb-3 text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
              {item.title}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none text-primary">
                -&gt;
              </span>
            </h2>
            <p className="m-0 max-w-[30ch] text-sm text-white/60 leading-relaxed group-hover:text-white/80 transition-colors cursor-default">
              {item.desc}
            </p>
          </a>
        ))}
      </div>
    </main>
  );
}
