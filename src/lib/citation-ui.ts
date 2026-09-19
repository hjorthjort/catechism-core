import type { ExternalReference, ExternalSource } from '../types';
import { abbreviateLinkedCitation } from './source-labels.ts';

type InterfaceLanguage = 'en' | 'sv';

const sourceLanguageNames: Record<string, readonly [string, string]> = {
  ar: ['Arabic', 'Arabiska'],
  de: ['German', 'Tyska'],
  en: ['English', 'Engelska'],
  es: ['Spanish', 'Spanska'],
  fr: ['French', 'Franska'],
  it: ['Italian', 'Italienska'],
  la: ['Latin', 'Latin'],
  mg: ['Malagasy', 'Malagassiska'],
  pt: ['Portuguese', 'Portugisiska'],
  sv: ['Swedish', 'Svenska'],
  zh: ['Chinese', 'Kinesiska'],
};

export function sourceLanguageName(code: string, interfaceLanguage: InterfaceLanguage) {
  return sourceLanguageNames[code]?.[interfaceLanguage === 'sv' ? 1 : 0] ?? code.toUpperCase();
}

export function paragraphTarget(reference?: ExternalReference) {
  const label = reference?.canonicalLabel ?? reference?.label;
  if (!label) return undefined;

  const namedCatechism = label.match(/\b(?:CCC|CC|KKK)\b\s*(?:§\s*)?(\d+)/i);
  const standaloneSection = label.match(/^\s*§\s*(\d+)\b/);
  const match = namedCatechism ?? standaloneSection;
  return match ? Number(match[1]) : undefined;
}

export function sourceDocumentUrl(source?: ExternalSource | null) {
  if (!source?.url) return undefined;

  try {
    const url = new URL(source.url);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function footnoteHeading(text: string, references: ExternalReference[], inlineReference = false) {
  const resolved = references
    .map((reference) => abbreviateLinkedCitation(reference.label, reference.kind, reference.sourceId))
    .join('; ');
  const ibid = /^(?:(?:cf|jfr|jmfr)\.\s*)?ibid\b/i.test(text.trim());
  return inlineReference || ibid ? resolved || text : text.trim() || resolved;
}
