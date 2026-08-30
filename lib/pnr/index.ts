import { getParser } from './parsers';
import { enrichPNR } from './enricher';
import { formatItinerary, mapPNRToCRMLead } from './formatter';
import { CRMLeadMapping, FormattedItinerary, NormalizedPNR } from './types';

export * from './types';
export * from './parsers';
export * from './enricher';
export * from './formatter';

export interface ParsePNRResult {
  normalized: NormalizedPNR;
  enriched: NormalizedPNR;
  formatted: FormattedItinerary;
  crmData: CRMLeadMapping;
  warnings: string[];
}

export function parsePNR(rawText: string, source: string = 'amadeus'): ParsePNRResult {
  const parser = getParser(source);
  const normalized = parser.parse(rawText || '');
  const enriched = enrichPNR(normalized);
  const formatted = formatItinerary(enriched);
  const crmData = mapPNRToCRMLead(enriched);

  return {
    normalized,
    enriched,
    formatted,
    crmData,
    warnings: enriched.warnings,
  };
}
