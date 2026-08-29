'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Compass, Mail, Send, CheckCircle2, Sparkles, Tag, BellRing } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function NewsletterPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/public/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ember-bg text-ember-text-primary flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-ember-border bg-ember-bg/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-btn bg-[#072B66] border border-[#FFC107] flex items-center justify-center text-[#FFC107] font-bold text-sm shadow-sm">
              ✈
            </div>
            <div>
              <span className="font-display font-bold text-lg text-ember-text-primary tracking-tight">
                AirlinesConsolidator
              </span>
              <span className="text-[10px] font-bold tracking-wider text-amber-700 block uppercase">
                Fare Intelligence
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/contact" className="text-ember-text-secondary hover:text-ember-primary">
              Custom Quotes
            </Link>
            <Link href="/login">
              <Button size="sm" variant="secondary">
                Agent Portal
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-16 px-6 max-w-xl mx-auto w-full">
        {submitted ? (
          <Card elevated className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold font-display text-ember-text-primary">
              You’re On the VIP Fare List!
            </h1>
            <p className="text-sm text-ember-text-secondary">
              We’ve registered <strong>{email}</strong> for weekly flight deals, mistake fares, and secret airline hold rates.
            </p>
            <div className="pt-3">
              <Link href="/contact">
                <Button variant="primary">Need a Quote Right Away?</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card elevated className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-btn bg-ember-primary/10 text-ember-primary flex items-center justify-center mx-auto mb-3">
                <BellRing className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-ember-primary">
                Weekly Flight Deals
              </span>
              <h1 className="text-2xl md:text-3xl font-bold font-display text-ember-text-primary">
                Get Private Airline Fare Drops
              </h1>
              <p className="text-xs text-ember-text-secondary leading-relaxed">
                Receive curated business class sales, offline consolidator seats, and last-minute international route bargains delivered to your inbox.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-btn bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Your Name (Optional)"
                placeholder="e.g. Eleanor"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <Input
                label="Email Address *"
                type="email"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Button
                type="submit"
                size="lg"
                isLoading={isSubmitting}
                className="w-full gap-2 shadow-primary-glow"
              >
                <Send className="w-4 h-4" />
                <span>Subscribe to Fare Alerts</span>
              </Button>
            </form>

            <div className="pt-3 border-t border-ember-border text-center">
              <p className="text-[11px] text-ember-neutral">
                No spam. Unsubscribe anytime with 1 click.
              </p>
            </div>
          </Card>
        )}
      </main>

      <footer className="border-t border-ember-border py-6 text-center text-xs text-ember-neutral">
        &copy; {new Date().getFullYear()} AirlinesConsolidator. All rights reserved.
      </footer>
    </div>
  );
}
