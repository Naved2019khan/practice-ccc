'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Compass,
  Plane,
  Calendar,
  Users,
  Send,
  CheckCircle2,
  Phone,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

export default function ContactUsPage() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    origin: '',
    destination: '',
    travelDate: '',
    returnDate: '',
    pax: 1,
    tripType: 'Round Trip',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit quote inquiry');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ember-bg text-ember-text-primary flex flex-col">
      {/* Public Header */}
      <header className="border-b border-ember-border bg-ember-bg/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-btn bg-ember-primary flex items-center justify-center text-white shadow-primary-glow">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <span className="font-display font-bold text-lg text-ember-text-primary">
                Ember Flight
              </span>
              <span className="text-[11px] font-semibold tracking-wider text-ember-neutral block uppercase">
                Concierge Travel
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/newsletter" className="text-ember-text-secondary hover:text-ember-primary">
              Fare Alerts
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
      <main className="flex-1 py-12 px-6 max-w-4xl mx-auto w-full">
        {submitted ? (
          <Card elevated className="p-8 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold font-display text-ember-text-primary">
              Quote Request Received!
            </h1>
            <p className="text-sm text-ember-text-secondary">
              Thank you, <strong>{form.name}</strong>. Our dedicated travel specialist has received your inquiry for <strong>{form.origin} &rarr; {form.destination}</strong> and will contact you via phone ({form.phone}) or email with the lowest negotiated fares.
            </p>
            <div className="pt-4">
              <Button onClick={() => setSubmitted(false)} variant="secondary">
                Submit Another Flight Request
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-8">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-ember-primary">
                Offline Flight Concierge
              </span>
              <h1 className="text-3xl md:text-4xl font-bold font-display text-ember-text-primary">
                Request a Custom Flight Itinerary
              </h1>
              <p className="text-sm text-ember-text-secondary">
                Access wholesale airline consolidator fares, multi-city routings, and VIP class upgrades tailored specifically for your dates.
              </p>
            </div>

            <Card elevated className="p-6 md:p-8 space-y-6">
              {error && (
                <div className="p-3 rounded-btn bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name & Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Full Name *"
                    placeholder="e.g. Eleanor Vance"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                  <Input
                    label="Phone Number (for instant WhatsApp/SMS quote) *"
                    placeholder="e.g. +1 (555) 234-5678"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                  />
                </div>

                {/* Email */}
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />

                {/* Origin & Destination */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Departure Airport / City *"
                    placeholder="e.g. JFK (New York)"
                    value={form.origin}
                    onChange={(e) => setForm({ ...form, origin: e.target.value })}
                    required
                  />
                  <Input
                    label="Destination Airport / City *"
                    placeholder="e.g. LHR (London)"
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                    required
                  />
                </div>

                {/* Dates & Pax */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Departure Date *"
                    type="date"
                    value={form.travelDate}
                    onChange={(e) => setForm({ ...form, travelDate: e.target.value })}
                    required
                  />
                  <Input
                    label="Return Date"
                    type="date"
                    value={form.returnDate}
                    onChange={(e) => setForm({ ...form, returnDate: e.target.value })}
                  />
                  <Input
                    label="Passengers (Pax)"
                    type="number"
                    min="1"
                    value={form.pax}
                    onChange={(e) => setForm({ ...form, pax: parseInt(e.target.value) || 1 })}
                  />
                </div>

                {/* Trip Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Trip Type"
                    value={form.tripType}
                    onChange={(e) => setForm({ ...form, tripType: e.target.value as any })}
                  >
                    <option value="Round Trip">Round Trip</option>
                    <option value="One Way">One Way</option>
                    <option value="Multi-City">Multi-City</option>
                  </Select>

                  <div className="flex items-center gap-2 pt-6 text-xs text-ember-neutral">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Price Match Guarantee & 100% Verified Airline Ticketing</span>
                  </div>
                </div>

                {/* Message */}
                <Textarea
                  label="Specific Airline Preferences or Flexible Dates"
                  placeholder="e.g. Prefer British Airways or Emirates, flexible within +/- 3 days, interested in Premium Economy upgrade..."
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />

                <div className="pt-2">
                  <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full gap-2 shadow-primary-glow">
                    <Send className="w-4 h-4" />
                    <span>Request Best Flight Quotation</span>
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </main>

      <footer className="border-t border-ember-border py-6 text-center text-xs text-ember-neutral">
        &copy; {new Date().getFullYear()} Ember Flight Concierge. All rights reserved.
      </footer>
    </div>
  );
}
