import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Coding Agent",
  description: "You inhouse repository manager",
};

import { Navbar } from "@/components/Navbar";
import { ThemeProvider } from "@/context/ThemeContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                const supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (theme === 'dark' || (!theme && supportDarkMode)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }

                // Patch for external browser scripts (e.g., mobile wallets) that might try to set selectedAddress
                // to undefined on an uninitialized ethereum object and crash the app.
                if (typeof window !== 'undefined') {
                   // Global error handling for benign or external script errors
                   window.addEventListener('unhandledrejection', (event) => {
                     if (event.reason && (event.reason.name === 'Canceled' || event.reason.message === 'Canceled')) {
                       event.preventDefault();
                     }
                   });

                   try {
                     if (window.ethereum === undefined) {
                        // We define a getter/setter to catch these attempts or just define the object
                        Object.defineProperty(window, 'ethereum', {
                          value: {},
                          writable: true,
                          configurable: true
                        });
                     }
                   } catch(e) {}
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        className={`${outfit.variable} font-sans bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground min-h-screen`}
      >
        <ThemeProvider>
          <Navbar />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
