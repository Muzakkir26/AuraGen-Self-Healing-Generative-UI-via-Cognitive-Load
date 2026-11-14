import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AuraGen - Self-Healing Generative UI via Cognitive Load',
  description:
    'Member 2 Frontend & UI Implementation: Dynamic cognitive telemetry, safe structured component rendering, and fluid morphing transitions.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen text-slate-900 bg-slate-50">
        {children}
      </body>
    </html>
  );
}

