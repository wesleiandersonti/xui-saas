export interface ParsedChannel {
  name: string;
  logo?: string;
  url: string;
  group: string;
}

export interface ParsedPlaylist {
  groups: Map<string, ParsedChannel[]>;
  invalidCount: number;
  totalEntries: number;
}

export function parseM3U(content: string): ParsedPlaylist {
  const normalized = String(content || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const groups = new Map<string, ParsedChannel[]>();
  let invalidCount = 0;
  let totalEntries = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();

    if (!line.startsWith('#EXTINF')) {
      continue;
    }

    const info = line;
    const urlLine = findNextUrl(lines, i + 1);

    if (!urlLine) {
      invalidCount += 1;
      continue;
    }

    const url = urlLine.trim();

    if (!url) {
      invalidCount += 1;
      continue;
    }

    const group = extractAttribute(info, 'group-title') || 'Outros';
    const logo = extractAttribute(info, 'tvg-logo') || '';
    const name = extractName(info) || extractAttribute(info, 'tvg-name') || 'Sem nome';

    const entry: ParsedChannel = {
      name: name.trim() || 'Sem nome',
      logo: logo.trim(),
      url: url.trim(),
      group: group.trim() || 'Outros',
    };

    totalEntries += 1;

    if (!groups.has(entry.group)) {
      groups.set(entry.group, []);
    }

    groups.get(entry.group)?.push(entry);
  }

  return {
    groups,
    invalidCount,
    totalEntries,
  };
}

function extractAttribute(info: string, attribute: string): string | undefined {
  const regex = new RegExp(`${attribute}="(.*?)"`, 'i');
  const match = info.match(regex);
  return match?.[1];
}

function extractName(info: string): string | undefined {
  const parts = info.split(',');
  if (parts.length < 2) {
    return undefined;
  }
  return parts.slice(1).join(',');
}

function findNextUrl(lines: string[], startIndex: number): string | undefined {
  for (let i = startIndex; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    return line;
  }
  return undefined;
}
