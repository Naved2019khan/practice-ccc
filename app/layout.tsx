import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/context/ToastContext';

export const metadata: Metadata = {
  title: 'AirlinesConsolidator CRM — Flight & VIP Travel Management',
  description: 'High-performance CRM for flight booking agreements, itineraries, and client management.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ember-bg text-ember-text-primary antialiased font-body selection:bg-ember-primary/20 selection:text-ember-primary">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
