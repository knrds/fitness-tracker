let cache;
let pending;
async function pubmedFallback() {
  const base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
  const today = new Date().toISOString().slice(0, 10);
  const term = `hypertrophy[Title/Abstract] AND resistance training[Title/Abstract] AND ${new Date().getUTCFullYear() - 2}/01/01:${today}[Date - Publication] AND hasabstract`;
  const search = await fetch(
    base +
      'esearch.fcgi?' +
      new URLSearchParams({ db: 'pubmed', term, sort: 'pub_date', retmax: '4', retmode: 'json' }),
    { signal: AbortSignal.timeout(6000) },
  );
  if (!search.ok) throw Error('Literature search unavailable');
  const result = await search.json();
  const ids = (result.esearchresult?.idlist ?? []).filter((id) => /^\d+$/.test(id)).slice(0, 4);
  if (!ids.length) return [];
  const response = await fetch(
    base +
      'efetch.fcgi?' +
      new URLSearchParams({ db: 'pubmed', id: ids.join(','), retmode: 'xml' }),
    { signal: AbortSignal.timeout(6000) },
  );
  if (!response.ok) throw Error('Abstracts unavailable');
  const xml = await response.text();
  const plain = (value) =>
    value
      .replace(/<[^>]*>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  return [...xml.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g)].flatMap((match) => {
    const article = match[1];
    const id = article.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1];
    const title = article.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/)?.[1];
    const abstract = [...article.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)]
      .map((part) => plain(part[1]))
      .join(' ');
    if (!id || !ids.includes(id) || !title || !abstract) return [];
    return [
      {
        title: plain(title).slice(0, 250),
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        abstract: abstract.slice(0, 1800),
      },
    ];
  });
}
// A fixed, non-personal query: no profile, injuries or messages leave the app for literature search.
async function getResearch() {
  if (cache && Date.now() - cache.time < 6 * 60 * 60 * 1000) return cache.value;
  if (pending) return pending;
  pending = (async () => {
    try {
      const year = new Date().getUTCFullYear() - 2;
      const query = `TITLE_ABS:"resistance training" AND TITLE_ABS:hypertrophy AND FIRST_PDATE:[${year}-01-01 TO ${new Date().toISOString().slice(0, 10)}] AND HAS_ABSTRACT:Y sort_date:y`;
      const url =
        'https://www.ebi.ac.uk/europepmc/webservices/rest/search?' +
        new URLSearchParams({ query, format: 'json', resultType: 'core', pageSize: '4' });
      const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
      if (!response.ok) throw Error('research unavailable');
      const data = await response.json();
      const sources = (data.resultList?.result ?? [])
        .filter((item) => typeof item.title === 'string' && /^\d+$/.test(item.pmid ?? ''))
        .map((item) => ({
          title: item.title.slice(0, 250),
          date: item.firstPublicationDate,
          url: `https://pubmed.ncbi.nlm.nih.gov/${item.pmid}/`,
          abstract: String(item.abstractText ?? '')
            .replace(/<[^>]+>/g, ' ')
            .slice(0, 1800),
        }));
      const value = { checkedAt: new Date().toISOString(), sources };
      if (sources.length) cache = { time: Date.now(), value };
      return value;
    } catch {
      try {
        const sources = await pubmedFallback();
        const value = { checkedAt: sources.length ? new Date().toISOString() : null, sources };
        cache = { time: Date.now() - (sources.length ? 0 : 6 * 60 * 60 * 1000 - 30000), value };
        return value;
      } catch {
        return { checkedAt: null, sources: [] };
      }
    } finally {
      pending = undefined;
    }
  })();
  return pending;
}
module.exports = { getResearch };
