'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Sparkles,
  Plane,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  Sliders,
  Calendar,
  Layers,
  Copy,
  Info,
} from 'lucide-react';
import { parsePNR, FormattedItinerary, CRMLeadMapping, ParsePNRResult } from '@/lib/pnr';

export const SAMPLE_AMADEUS_PNR = `1.1JONES/RACHAEL 
1 DL 46T 19JUL Q JFKAMS*SS1 436P 555A 20JUL F /DCDL /E
MOVIES 6**SKY PRIORITY IN C DELTA ONE SVC THIS FLT 
2 DL9355T 20JUL F AMSZAG*SS1 930A 1120A /DCDL /E
OPERATED BY KLM CITYHOPPER 
*DL CODE SHARE-QUOTE OPERATED BY KLMCITYHOPPE AS KL FLT 1939 
ONLINE CONNECTING TRAFFIC ONLY 
3 DL8329K 29JUL S ZAGCDG*SS1 310P 510P /DCDL /E
OPERATED BY AIR FRANCE
*DL CODE SHARE-QUOTE OPERATED BY AIR FRANCE AS AF FLT 1561
ONLINE CONNECTING TRAFFIC ONLY
4 DL1021K 29JUL S CDGJFK*SS1 710P 925P /DCDL /E 
OPERATED BY AIR FRANCE
*DL CODE SHARE-QUOTE OPERATED BY AIR FRANCE AS AF FLT 8`;

export interface PNRConverterBoxProps {
  mode: 'pnr' | 'manual';
  onModeChange: (mode: 'pnr' | 'manual') => void;
  onParsed?: (result: ParsePNRResult) => void;
  initialRawText?: string;
  className?: string;
}

export const PNRConverterBox: React.FC<PNRConverterBoxProps> = ({
  mode,
  onModeChange,
  onParsed,
  initialRawText = '',
  className = '',
}) => {
  const [rawText, setRawText] = useState(initialRawText);
  const [parseResult, setParseResult] = useState<ParsePNRResult | null>(null);
  const [hasConverted, setHasConverted] = useState(false);

  const handleConvert = useCallback(
    (textToParse: string) => {
      const text = textToParse.trim();
      if (!text) {
        setParseResult(null);
        setHasConverted(false);
        return;
      }
      try {
        const res = parsePNR(text, 'amadeus');
        setParseResult(res);
        setHasConverted(true);
        if (onParsed) {
          onParsed(res);
        }
      } catch (err) {
        console.error('PNR Parse Error:', err);
      }
    },
    [onParsed]
  );

  // Auto-convert if initial text is provided
  useEffect(() => {
    if (initialRawText && !hasConverted) {
      setRawText(initialRawText);
      handleConvert(initialRawText);
    }
  }, [initialRawText, handleConvert, hasConverted]);

  const handleLoadSample = () => {
    setRawText(SAMPLE_AMADEUS_PNR);
    handleConvert(SAMPLE_AMADEUS_PNR);
  };

  const handleClear = () => {
    setRawText('');
    setParseResult(null);
    setHasConverted(false);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ── Mode Switch Bar ────────────────────────────────────────── */}
      <div className="flex items-center justify-between p-2 rounded-btn bg-ember-surface-raised border border-ember-border shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-btn bg-ember-primary/10 flex items-center justify-center text-ember-primary">
            <Plane className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-ember-text-primary flex items-center gap-1.5">
              <span>Flight Entry Mode</span>
              {mode === 'pnr' ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  PNR Auto-Convert Active
                </span>
              ) : (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                  Manual Entry Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-ember-neutral">
              {mode === 'pnr'
                ? 'Paste GDS/Amadeus PNR text to automatically populate flights and passengers'
                : 'Enter legs and passenger fields manually'}
            </p>
          </div>
        </div>

        {/* Switch Button */}
        <div className="flex items-center p-1 rounded-btn bg-white border border-ember-border shadow-xs">
          <button
            type="button"
            onClick={() => onModeChange('pnr')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-bold transition-all ${
              mode === 'pnr'
                ? 'bg-ember-primary text-white shadow-sm'
                : 'text-ember-neutral hover:text-ember-text-primary'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>PNR Converter</span>
            <span className="text-[9px] px-1 py-0.2 bg-white/20 rounded font-normal">Default</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange('manual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-bold transition-all ${
              mode === 'manual'
                ? 'bg-ember-primary text-white shadow-sm'
                : 'text-ember-neutral hover:text-ember-text-primary'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Manual Entry</span>
          </button>
        </div>
      </div>

      {/* ── PNR Converter Section ───────────────────────────────────── */}
      {mode === 'pnr' && (
        <div className="space-y-4 rounded-btn border border-ember-border bg-ember-surface p-3.5">
          {/* Header & Quick Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-ember-primary" />
              <label className="text-xs font-bold uppercase tracking-wider text-ember-text-primary">
                Amadeus / GDS PNR Raw Text
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadSample}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-ember-primary bg-ember-primary/10 hover:bg-ember-primary/20 rounded-btn transition-colors"
              >
                <Copy className="w-3 h-3" />
                Load Sample PNR
              </button>
              {rawText && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-ember-neutral hover:text-red-600 rounded-btn transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Text Area */}
          <div className="relative">
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => {
                const val = e.target.value;
                setRawText(val);
                if (val.trim()) {
                  handleConvert(val);
                } else {
                  setParseResult(null);
                }
              }}
              placeholder={`Paste your PNR here. Example:\n1.1JONES/RACHAEL\n1 DL 46T 19JUL Q JFKAMS*SS1 436P 555A 20JUL F /DCDL /E\n2 DL9355T 20JUL F AMSZAG*SS1 930A 1120A /DCDL /E`}
              className="w-full font-mono text-xs p-3 rounded-btn bg-ember-surface-raised border border-ember-border text-ember-text-primary focus:outline-none focus:border-ember-primary focus:ring-1 focus:ring-ember-primary transition-all resize-y placeholder:text-stone-400 leading-relaxed"
            />
          </div>

          {/* Convert Action Button */}
          <div className="flex items-center justify-between pt-1">
            <div className="text-[11px] text-ember-neutral flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-ember-primary" />
              <span>Segments, airlines, and airports are enriched in real-time.</span>
            </div>
            <button
              type="button"
              onClick={() => handleConvert(rawText)}
              disabled={!rawText.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-ember-primary hover:bg-ember-primary/90 disabled:opacity-50 disabled:pointer-events-none rounded-btn shadow-sm transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Convert & Apply to Form
            </button>
          </div>

          {/* ── Formatted Itinerary Result Preview ────────────────── */}
          {parseResult && parseResult.formatted.segments.length > 0 && (
            <div className="pt-3 border-t border-ember-border space-y-3">
              {/* Summary Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-ember-surface-raised rounded-btn border border-ember-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ember-text-primary">
                    {parseResult.formatted.summary.route}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ember-primary/10 text-ember-primary border border-ember-primary/20">
                    {parseResult.formatted.summary.tripType}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {parseResult.formatted.segments.length} Segment
                    {parseResult.formatted.segments.length > 1 ? 's' : ''}
                  </span>
                </div>

                {parseResult.formatted.passengers.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-ember-text-secondary">
                    <Users className="w-3.5 h-3.5 text-ember-primary" />
                    <span className="font-semibold">
                      {parseResult.formatted.passengers.map((p) => p.fullName).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Warnings if any */}
              {parseResult.warnings.length > 0 && (
                <div className="flex items-start gap-2 p-2.5 rounded-btn bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    {parseResult.warnings.map((w, i) => (
                      <p key={i}>{w}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Formatted Itinerary Segment Cards - matching requirement_2.md specification */}
              <div className="space-y-2.5">
                <div className="grid grid-cols-4 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-ember-neutral border-b border-ember-border/60">
                  <div>Carrier / Flight</div>
                  <div>Class</div>
                  <div>Departing</div>
                  <div>Arriving</div>
                </div>

                {parseResult.formatted.segments.map((seg, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-btn border border-ember-border bg-white hover:border-ember-primary/40 transition-colors shadow-xs"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                      {/* Carrier / Flight */}
                      <div className="space-y-0.5">
                        <div className="font-bold text-ember-text-primary text-xs">
                          {seg.marketingCarrierName || seg.marketingCarrierCode}
                        </div>
                        <div className="font-mono font-bold text-ember-primary text-xs">
                          {seg.marketingCarrierCode}{seg.flightNumber}
                        </div>
                        {seg.operatingCarrierText && (
                          <p className="text-[10px] text-ember-text-secondary font-medium">
                            {seg.operatingCarrierText}
                          </p>
                        )}
                        {seg.codeshare && !seg.operatingCarrierText && (
                          <span className="inline-block text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            Codeshare
                          </span>
                        )}
                      </div>

                      {/* Class */}
                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-stone-100 text-stone-800 border border-stone-200">
                          {seg.cabinClass} ({seg.bookingClass})
                        </span>
                      </div>

                      {/* Departing */}
                      <div className="space-y-0.5">
                        <div className="font-semibold text-ember-text-primary">
                          {seg.departure.airportName} ({seg.departure.airportCode})
                        </div>
                        {(seg.departure.city || seg.departure.country) && (
                          <div className="text-[11px] text-ember-neutral">
                            {[seg.departure.city, seg.departure.country].filter(Boolean).join(', ')}
                          </div>
                        )}
                        <div className="text-[11px] font-bold text-ember-primary flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{seg.departure.formattedDate} @ {seg.departure.formattedTime}</span>
                        </div>
                      </div>

                      {/* Arriving */}
                      <div className="space-y-0.5">
                        <div className="font-semibold text-ember-text-primary">
                          {seg.arrival.airportName} ({seg.arrival.airportCode})
                        </div>
                        {(seg.arrival.city || seg.arrival.country) && (
                          <div className="text-[11px] text-ember-neutral">
                            {[seg.arrival.city, seg.arrival.country].filter(Boolean).join(', ')}
                          </div>
                        )}
                        <div className="text-[11px] font-bold text-ember-primary flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{seg.arrival.formattedDate} @ {seg.arrival.formattedTime}</span>
                        </div>
                      </div>
                    </div>

                    {/* Remarks if any */}
                    {seg.remarks && seg.remarks.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-ember-border/50 text-[10px] text-ember-neutral flex flex-wrap gap-1.5">
                        {seg.remarks.map((r, rIdx) => (
                          <span
                            key={rIdx}
                            className="px-1.5 py-0.5 rounded bg-ember-surface border border-ember-border"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
