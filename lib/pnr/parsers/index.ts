import { NormalizedPNR } from '../types';
import { AmadeusParser } from './amadeus';

export interface IPNRParser {
  parse(rawText: string): NormalizedPNR;
}

const parserRegistry: Record<string, () => IPNRParser> = {
  amadeus: () => new AmadeusParser(),
  generic: () => new AmadeusParser(),
};

export function getParser(source: string = 'amadeus'): IPNRParser {
  const normalizedSource = (source || 'amadeus').toLowerCase().trim();
  const factory = parserRegistry[normalizedSource] || parserRegistry['amadeus'];
  return factory();
}

export function registerParser(source: string, factory: () => IPNRParser) {
  parserRegistry[source.toLowerCase().trim()] = factory;
}
