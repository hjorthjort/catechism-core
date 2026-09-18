function cleanText(value) {
  return String(value ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function footnoteIdFromHref(href) {
  const match = String(href ?? '').match(/\/fn\/([^/?#"'<>]+)/i);
  if (!match) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function extractMarkers(html) {
  const markers = [];
  for (const match of String(html ?? '').matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = match[1]?.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    const id = footnoteIdFromHref(href);
    if (!id) continue;

    const superscript = match[2]?.match(/<sup\b[^>]*>([\s\S]*?)<\/sup>/i)?.[1];
    markers.push({
      id,
      number: superscript ? cleanText(superscript).replace(/[^0-9]/g, '') : '',
    });
  }
  return markers;
}

function linkedHtml(node) {
  return [
    node.textHtml ?? '',
    ...(node.headings ?? []).map((heading) => heading.html ?? ''),
  ].join(' ');
}

function removeFootnotes(nodes, ids) {
  for (const node of nodes) {
    node.footnotes = (node.footnotes ?? []).filter((footnote) => !ids.has(String(footnote.id)));
    node.externalReferences = (node.externalReferences ?? []).filter(
      (reference) => !ids.has(String(reference.footnoteId)),
    );
  }
}

function markerIndex(text, number) {
  const pattern = new RegExp(`(^|[^\\d\\s])(${escapeRegExp(number)})(?!\\d)`);
  const match = pattern.exec(text);
  return match ? match.index + match[1].length : -1;
}

function injectHeadingMarkers(text, footnotes, nodeId) {
  const markers = footnotes
    .map((footnote) => ({
      footnote,
      index: markerIndex(text, String(footnote.number)),
    }))
    .filter((entry) => entry.index >= 0)
    .sort((left, right) => left.index - right.index);

  let html = '';
  let cursor = 0;
  for (const { footnote, index } of markers) {
    const number = String(footnote.number);
    if (index < cursor) continue;
    html += escapeHtml(text.slice(cursor, index));
    html += `<a href="#!/search/fn/${encodeURIComponent(String(footnote.id))}" id="fnref:${escapeHtml(String(nodeId))}:${escapeHtml(String(footnote.id))}"><sup>${escapeHtml(number)}</sup></a>`;
    cursor = index + number.length;
  }
  html += escapeHtml(text.slice(cursor));
  return html;
}

function insertInlineMarkers(nodes, orphanIds) {
  for (const node of nodes) {
    const inlineFootnotes = (node.footnotes ?? []).filter(
      (footnote) => orphanIds.has(String(footnote.id)) && String(footnote.id).startsWith('inline:'),
    );
    if (inlineFootnotes.length === 0) continue;

    const byText = new Map();
    for (const footnote of inlineFootnotes) {
      const key = cleanText(footnote.text);
      const matches = byText.get(key) ?? [];
      matches.push(footnote);
      byText.set(key, matches);
    }

    node.textHtml = String(node.textHtml ?? '').replace(/\(([^()]{1,1200})\)/g, (whole, content) => {
      const candidates = byText.get(cleanText(content));
      const footnote = candidates?.shift();
      if (!footnote) return whole;
      const id = String(footnote.id);
      return `<a class="inline-citation" href="#!/search/fn/${encodeURIComponent(id)}" id="fnref:${escapeHtml(id)}">(${content})</a>`;
    });
  }
}

function reconcileHeadingFootnotes(nodes, orphanIds) {
  const orphanEntries = [];
  for (const node of nodes) {
    for (const footnote of node.footnotes ?? []) {
      const id = String(footnote.id);
      if (!orphanIds.has(id) || !id.startsWith('h')) continue;
      orphanEntries.push({
        sourceNode: node,
        footnote,
        references: (node.externalReferences ?? []).filter(
          (reference) => String(reference.footnoteId) === id,
        ),
      });
    }
  }

  const canonicalBySignature = new Map();
  const discardedIds = new Set();
  for (const entry of orphanEntries) {
    const signature = `${entry.footnote.number}\u0000${cleanText(entry.footnote.text)}`;
    if (canonicalBySignature.has(signature)) {
      discardedIds.add(String(entry.footnote.id));
    } else {
      canonicalBySignature.set(signature, entry);
    }
  }

  const canonicalEntries = [...canonicalBySignature.values()];
  const assignments = new Map();
  for (const entry of canonicalEntries) {
    const number = String(entry.footnote.number);
    const candidates = [];
    for (const node of nodes) {
      for (const heading of node.headings ?? []) {
        if (markerIndex(String(heading.text ?? ''), number) < 0) continue;
        candidates.push({
          node,
          heading,
          distance: Math.abs(Number(node.id) - Number(entry.sourceNode.id)),
        });
      }
    }
    candidates.sort((left, right) => left.distance - right.distance || left.node.id - right.node.id);
    const chosen = candidates[0];
    if (!chosen) continue;

    const signature = String(chosen.heading.text ?? '');
    const entries = assignments.get(signature) ?? [];
    entries.push(entry);
    assignments.set(signature, entries);
  }

  const headingIds = new Set(orphanEntries.map((entry) => String(entry.footnote.id)));
  removeFootnotes(nodes, new Set([...headingIds, ...discardedIds]));

  for (const node of nodes) {
    for (const heading of node.headings ?? []) {
      const entries = assignments.get(String(heading.text ?? ''));
      if (!entries?.length) continue;

      heading.html = injectHeadingMarkers(
        String(heading.text ?? ''),
        entries.map((entry) => entry.footnote),
        node.id,
      );
      for (const entry of entries) {
        node.footnotes.push({ ...entry.footnote });
        node.externalReferences.push(
          ...entry.references.map((reference) => ({ ...reference })),
        );
      }
    }
    node.footnotes.sort((left, right) => Number(left.number) - Number(right.number));
  }
}

function removeMisassignedDuplicates(nodes) {
  const markerIds = new Set(nodes.flatMap((node) => extractMarkers(linkedHtml(node)).map((marker) => marker.id)));
  const markedSignatures = new Set();
  for (const node of nodes) {
    for (const footnote of node.footnotes ?? []) {
      if (!markerIds.has(String(footnote.id))) continue;
      markedSignatures.add(`${footnote.number}\u0000${cleanText(footnote.text)}`);
    }
  }

  const duplicateIds = new Set();
  for (const node of nodes) {
    for (const footnote of node.footnotes ?? []) {
      const id = String(footnote.id);
      if (markerIds.has(id) || id.startsWith('h') || id.startsWith('inline:')) continue;
      const signature = `${footnote.number}\u0000${cleanText(footnote.text)}`;
      if (markedSignatures.has(signature)) duplicateIds.add(id);
    }
  }
  removeFootnotes(nodes, duplicateIds);
}

export function repairEnglishFootnoteIntegrity(nodes) {
  const initialMarkerIds = new Set(
    nodes.flatMap((node) => extractMarkers(linkedHtml(node)).map((marker) => marker.id)),
  );
  const orphanIds = new Set(
    nodes.flatMap((node) =>
      (node.footnotes ?? [])
        .map((footnote) => String(footnote.id))
        .filter((id) => !initialMarkerIds.has(id)),
    ),
  );

  insertInlineMarkers(nodes, orphanIds);
  reconcileHeadingFootnotes(nodes, orphanIds);
  removeMisassignedDuplicates(nodes);
  return nodes;
}

export function auditFootnoteIntegrity(nodes, language = 'unknown') {
  const issues = [];
  let markerCount = 0;
  let footnoteCount = 0;

  for (const node of nodes) {
    const markers = extractMarkers(linkedHtml(node));
    const footnotes = node.footnotes ?? [];
    markerCount += markers.length;
    footnoteCount += footnotes.length;

    const objectsById = new Map();
    for (const footnote of footnotes) {
      const id = String(footnote.id);
      if (objectsById.has(id)) issues.push(`${language} §${node.id}: duplicate footnote object ${id}`);
      objectsById.set(id, footnote);
    }

    const markerIds = new Set();
    for (const marker of markers) {
      if (markerIds.has(marker.id)) issues.push(`${language} §${node.id}: duplicate marker ${marker.id}`);
      markerIds.add(marker.id);
      const footnote = objectsById.get(marker.id);
      if (!footnote) {
        issues.push(`${language} §${node.id}: marker ${marker.id} has no footnote object`);
      } else if (marker.number && marker.number !== String(footnote.number).replace(/[^0-9]/g, '')) {
        issues.push(`${language} §${node.id}: marker ${marker.id} displays ${marker.number}, expected ${footnote.number}`);
      }
    }

    for (const footnote of footnotes) {
      if (!markerIds.has(String(footnote.id))) {
        issues.push(`${language} §${node.id}: footnote ${footnote.id} has no marker`);
      }
    }
  }

  return { language, markerCount, footnoteCount, issues };
}

export function assertFootnoteIntegrity(nodes, language) {
  const report = auditFootnoteIntegrity(nodes, language);
  if (report.issues.length > 0) {
    throw new Error(
      `Footnote integrity failed (${language}): ${report.issues.slice(0, 20).join('; ')}${report.issues.length > 20 ? `; …and ${report.issues.length - 20} more` : ''}`,
    );
  }
  return report;
}
