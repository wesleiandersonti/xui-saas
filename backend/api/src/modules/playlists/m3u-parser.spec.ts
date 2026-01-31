import { parseM3U } from './m3u-parser';

describe('parseM3U', () => {
  it('parses groups and channels', () => {
    const content =
      '#EXTM3U\n#EXTINF:-1 tvg-logo="http://logo" group-title="News",Channel One\nhttp://stream1\n#EXTINF:-1 group-title="Sports",Channel Two\nhttp://stream2\n';
    const parsed = parseM3U(content);

    expect(parsed.groups.size).toBe(2);
    expect(parsed.invalidCount).toBe(0);

    const news = parsed.groups.get('News');
    expect(news).toBeDefined();
    expect(news?.[0].name).toBe('Channel One');
    expect(news?.[0].logo).toBe('http://logo');
  });

  it('handles missing url', () => {
    const content = '#EXTM3U\n#EXTINF:-1 group-title="News",Channel One\n\n';
    const parsed = parseM3U(content);
    expect(parsed.invalidCount).toBe(1);
  });

  it('normalizes CRLF and missing name', () => {
    const content =
      '#EXTM3U\r\n#EXTINF:-1 group-title="Other"\r\nhttp://stream\r\n';
    const parsed = parseM3U(content);
    const group = parsed.groups.get('Other');
    expect(group).toBeDefined();
    expect(group?.[0].name).toBe('Sem nome');
  });
});
