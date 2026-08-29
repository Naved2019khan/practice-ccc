'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  AlertCircle,
  Globe,
  MapPin,
  Laptop,
  Clock,
  Phone,
  Mail,
  ShieldCheck,
} from 'lucide-react';

export default function CustomerItineraryPortal() {
  const params = useParams();
  const token = params.token as string;

  const [itinerary, setItinerary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItinerary = async () => {
      try {
        setLoading(true);
        // This endpoint automatically records visitor IP, browser, device, and resolves geo-location
        const res = await fetch(`/api/portal/${token}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Unable to verify booking confirmation.');
        }

        setItinerary(data.itinerary);
      } catch (err: any) {
        setError(err.message || 'Confirmation link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchItinerary();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-4">
        <div className="text-center space-y-4 bg-white p-8 rounded-2xl border border-blue-100 shadow-xl max-w-sm w-full">
          <div className="w-12 h-12 rounded-full border-4 border-[#0B3C8A] border-t-[#FFC107] animate-spin mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#0B3C8A]">Verifying Confirmation...</h3>
            <p className="text-xs text-slate-500">Connecting to Airlines Consolidator Security Network</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !itinerary) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Confirmation Not Found</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {error || 'This booking authorization link could not be located or has expired.'}
          </p>
          <div className="pt-2">
            <a
              href="tel:+18888830727"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0B3C8A] hover:bg-[#082a61] text-white text-xs font-bold rounded-lg transition-colors shadow-md"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Contact Concierge Support</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const bookingRef =
    itinerary.invoiceNumber ||
    itinerary.pnr ||
    `AC-${(itinerary.token || '04D6D2').slice(-6).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col justify-between font-sans selection:bg-[#FFC107] selection:text-[#0B3C8A]">
      {/* Top Navbar */}
      <header className="bg-gradient-to-r from-[#0B3C8A] to-[#1657B8] text-white py-4 px-6 border-b-2 border-[#FFC107] shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="bg-[#072B66] px-3.5 py-1.5 rounded-lg border border-[#FFC107] shadow-sm flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#FFC107] text-[#072B66] font-bold text-xs flex items-center justify-center">✈</div>
            <span className="text-sm font-black tracking-tight text-white">
              AIRLINES<span className="text-[#FFC107]">CONSOLIDATOR</span>
            </span>
          </div>
          <span className="bg-[#FFC107] text-[#0B3C8A] text-[11px] font-extrabold uppercase px-3 py-1 rounded-full shadow-sm">
            Official Verification Portal
          </span>
        </div>
      </header>

      {/* Main Congratulations Center Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-lg w-full bg-white border border-blue-100 rounded-3xl p-6 sm:p-10 text-center shadow-xl space-y-6">
          {/* Green Checkmark Badge */}
          <div className="relative inline-block mx-auto">
            <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-500 text-emerald-600 flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-[#0B3C8A] text-[#FFC107] p-1.5 rounded-full border-2 border-white shadow-sm">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full">
              ✓ Authorization Verified
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Congratulations!
            </h1>
            <p className="text-sm font-semibold text-[#0B3C8A]">
              Dear {itinerary.name || 'Valued Passenger'}
            </p>
            <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
              Your flight booking confirmation and payment authorization agreement have been successfully received, verified, and secured with our travel concierge team.
            </p>
          </div>

          {/* Reference Pill */}
          <div className="bg-[#0B3C8A] text-white py-3 px-5 rounded-2xl shadow-sm flex items-center justify-between font-mono text-xs">
            <span className="text-blue-200 uppercase font-semibold">Booking Reference:</span>
            <span className="text-base font-black text-[#FFC107]">{bookingRef}</span>
          </div>

          {/* Verified Telemetry Audit Stamp */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2 font-mono">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-200 flex items-center justify-between">
              <span>Security &amp; Compliance Audit Stamp</span>
              <span className="text-emerald-700 font-bold">✓ Logged</span>
            </div>

            <div className="flex items-center justify-between text-slate-700">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                <span>Visitor IP:</span>
              </span>
              <span className="font-bold text-slate-900">{itinerary.verifiedIp || '127.0.0.1'}</span>
            </div>

            <div className="flex items-center justify-between text-slate-700">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-indigo-600" />
                <span>Browser &amp; OS:</span>
              </span>
              <span className="font-bold text-slate-900 truncate max-w-[200px] text-right">{itinerary.verifiedDevice || 'Chrome on Windows'}</span>
            </div>

            <div className="flex items-center justify-between text-slate-700">
              <span className="text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Location:</span>
              </span>
              <span className="font-bold text-emerald-700">{itinerary.verifiedLocation || 'Verified Network Location'}</span>
            </div>

            <div className="flex items-center justify-between text-slate-700">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Timestamp:</span>
              </span>
              <span className="font-semibold text-slate-800">
                {new Date(itinerary.authorizedAt || Date.now()).toUTCString()}
              </span>
            </div>
          </div>

          {/* Support Contacts */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs">
            <a
              href="tel:+18888830727"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#0B3C8A] hover:bg-[#082a61] text-white font-bold rounded-xl transition-colors shadow-md"
            >
              <Phone className="w-3.5 h-3.5 text-[#FFC107]" />
              <span>Call Concierge: +1 (888) 883-0727</span>
            </a>
            <a
              href="mailto:concierge@airlinesconsolidator.com"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors border border-slate-200"
            >
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              <span>Email Support</span>
            </a>
          </div>
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 bg-white border-t border-slate-200">
        <p>&copy; {new Date().getFullYear()} AirlinesConsolidator &bull; Verified B2B &amp; VIP Travel Consolidator Agreement</p>
      </footer>
    </div>
  );
}
