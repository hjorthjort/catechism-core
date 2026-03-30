import type { CatechismNode } from '../types';

export type NodePaletteTone = {
  solid: string;
  soft: string;
  wash: string;
  border: string;
  ink: string;
};

const partPalette: Record<
  string,
  {
    hue: number;
    saturation: number;
    lightness: number;
  }
> = {
  Prologue: { hue: 42, saturation: 26, lightness: 82 },
  'Profession of Faith': { hue: 218, saturation: 68, lightness: 52 },
  'Celebration of the Christian Mystery': { hue: 2, saturation: 62, lightness: 44 },
  'Life in Christ': { hue: 50, saturation: 88, lightness: 52 },
  'Christian Prayer': { hue: 144, saturation: 50, lightness: 42 },
};

type HierarchyKeys = {
  partKey: string;
  sectionKey: string | null;
  chapterKey: string | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getHierarchyKeys(node: CatechismNode): HierarchyKeys {
  const partKey = node.part || 'Prologue';
  const sectionKey = node.breadcrumbs.find((entry) => entry.startsWith('Section ')) ?? null;
  const chapterKey = node.breadcrumbs.find((entry) => entry.startsWith('Chapter ')) ?? null;

  return { partKey, sectionKey, chapterKey };
}

function getOrderedHierarchy(nodes: CatechismNode[]) {
  const keysByNode = new Map<number, HierarchyKeys>();
  const sectionsByPart = new Map<string, string[]>();
  const chaptersBySection = new Map<string, string[]>();

  for (const node of nodes) {
    const keys = getHierarchyKeys(node);
    keysByNode.set(node.id, keys);

    if (keys.sectionKey) {
      const partSections = sectionsByPart.get(keys.partKey) ?? [];
      if (!partSections.includes(keys.sectionKey)) {
        partSections.push(keys.sectionKey);
        sectionsByPart.set(keys.partKey, partSections);
      }
    }

    if (keys.chapterKey) {
      const chapterGroupKey = `${keys.partKey}::${keys.sectionKey ?? '__root__'}`;
      const sectionChapters = chaptersBySection.get(chapterGroupKey) ?? [];
      if (!sectionChapters.includes(keys.chapterKey)) {
        sectionChapters.push(keys.chapterKey);
        chaptersBySection.set(chapterGroupKey, sectionChapters);
      }
    }
  }

  return { keysByNode, sectionsByPart, chaptersBySection };
}

function getOffset(index: number, count: number, spread: number) {
  if (count <= 1) {
    return 0;
  }

  const center = (count - 1) / 2;
  return ((index - center) / Math.max(center, 1)) * spread;
}

function formatHslColor(hue: number, saturation: number, lightness: number, alpha?: number) {
  const normalizedHue = Math.round((hue + 360) % 360);
  const normalizedSaturation = Math.round(saturation);
  const normalizedLightness = Math.round(lightness);

  if (alpha === undefined) {
    return `hsl(${normalizedHue} ${normalizedSaturation}% ${normalizedLightness}%)`;
  }

  return `hsl(${normalizedHue} ${normalizedSaturation}% ${normalizedLightness}% / ${alpha})`;
}

export function buildNodeColorMap(nodes: CatechismNode[]) {
  const { keysByNode, sectionsByPart, chaptersBySection } = getOrderedHierarchy(nodes);

  return new Map<number, NodePaletteTone>(
    nodes.map((node) => {
      const keys = keysByNode.get(node.id) ?? getHierarchyKeys(node);
      const baseColor = partPalette[keys.partKey] ?? { hue: 210, saturation: 12, lightness: 56 };
      const sectionKeys = sectionsByPart.get(keys.partKey) ?? [];
      const chapterKeys = chaptersBySection.get(`${keys.partKey}::${keys.sectionKey ?? '__root__'}`) ?? [];
      const sectionIndex = keys.sectionKey ? sectionKeys.indexOf(keys.sectionKey) : -1;
      const chapterIndex = keys.chapterKey ? chapterKeys.indexOf(keys.chapterKey) : -1;
      const prefersBrightnessVariation = keys.partKey === 'Life in Christ';

      const sectionHueOffset =
        sectionIndex >= 0 ? getOffset(sectionIndex, sectionKeys.length, prefersBrightnessVariation ? 6 : 24) : 0;
      const chapterHueOffset =
        chapterIndex >= 0 ? getOffset(chapterIndex, chapterKeys.length, prefersBrightnessVariation ? 3 : 9) : 0;
      const sectionLightnessOffset =
        sectionIndex >= 0 ? getOffset(sectionIndex, sectionKeys.length, prefersBrightnessVariation ? 16 : 8) : 0;
      const chapterLightnessOffset =
        chapterIndex >= 0 ? getOffset(chapterIndex, chapterKeys.length, prefersBrightnessVariation ? 6 : 5) : 0;

      const hue = baseColor.hue + sectionHueOffset + chapterHueOffset;
      const saturation = clamp(baseColor.saturation + (keys.sectionKey ? 6 : 0) + (keys.chapterKey ? 4 : 0), 20, 96);
      const lightness = clamp(
        baseColor.lightness + sectionLightnessOffset + chapterLightnessOffset,
        keys.partKey === 'Prologue' ? 70 : 30,
        keys.partKey === 'Prologue' ? 88 : 74,
      );

      return [
        node.id,
        {
          solid: formatHslColor(hue, saturation, lightness),
          soft: formatHslColor(hue, clamp(saturation - 8, 18, 96), clamp(lightness + 18, 40, 90), 0.18),
          wash: formatHslColor(hue, clamp(saturation - 18, 18, 92), clamp(lightness + 28, 48, 94), 0.6),
          border: formatHslColor(hue, clamp(saturation - 6, 18, 96), clamp(lightness + 6, 32, 82), 0.28),
          ink: formatHslColor(hue, clamp(saturation + 2, 20, 96), clamp(lightness - 26, 18, 42)),
        },
      ];
    }),
  );
}
