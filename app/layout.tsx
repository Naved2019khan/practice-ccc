import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ember Flight CRM — Premium Flight Lead Concierge',
  description: 'A warm, craft-focused CRM for flight and travel offline lead management.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ember-bg text-ember-text-primary antialiased font-body selection:bg-ember-primary/20 selection:text-ember-primary">
        {children}
      </body>
    </html>
  );
}
