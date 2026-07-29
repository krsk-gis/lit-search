// Vercel Serverless Function: /api/citations
// A Semantic Scholar API-t proxyzza, hogy egy adott (DOI-val azonosított)
// cikkhez lekérje, mit hivatkozik (references) vagy mi hivatkozza (citations)
// - ez adja a "hólabda-módszer" (kapcsolódó cikkek) funkció alapját.
// Csak Semantic Scholarral megoldott: neki van dedikált, DOI-alapú
// citations/references végpontja tiszta metaadatokkal.

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, headers) {
  const delays = [1500, 2500, 4000];
  let resp = await fetch(url, { headers });
  for (const delay of delays) {
    if (resp.status !== 429) break;
    await sleep(delay);
    resp = await fetch(url, { headers });
  }
  return resp;
}

function mapPaper(p) {
  if (!p) return null;
  const authorNames = (p.authors || []).map((a) => a.name).filter(Boolean);
  const doi = (p.externalIds && p.externalIds.DOI) || "";
  const link = p.url || (doi ? `https://doi.org/${doi}` : "#");
  const oaUrl = (p.openAccessPdf && p.openAccessPdf.url) || null;
  return {
    title: p.title || "Nincs cím",
    author: authorNames.length ? authorNames[0] : "N/A",
    authors: authorNames,
    year: p.year ? String(p.year) : "",
    journal: p.venue || "",
    citations: p.citationCount || 0,
    link,
    doi,
    isOA: !!oaUrl,
    oaUrl,
    source: "Semantic Scholar",
  };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const { doi, direction, count: countParam } = req.query;
  if (!doi) {
    res.status(400).json({ error: 'Hiányzó "doi" paraméter.' });
    return;
  }
  if (direction !== "citations" && direction !== "references") {
    res.status(400).json({ error: '"direction" csak "citations" vagy "references" lehet.' });
    return;
  }

  const count = Math.min(parseInt(countParam, 10) || 10, 50);
  const nestedField = direction === "citations" ? "citingPaper" : "citedPaper";
  const fields = `${nestedField}.title,${nestedField}.year,${nestedField}.authors,${nestedField}.venue,${nestedField}.citationCount,${nestedField}.externalIds,${nestedField}.url,${nestedField}.openAccessPdf`;

  const headers = {};
  if (process.env.SEMANTIC_SCHOLAR_API_KEY) headers["x-api-key"] = process.env.SEMANTIC_SCHOLAR_API_KEY;

  const params = new URLSearchParams({ fields, limit: String(count) });
  const url = `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}/${direction}?${params}`;

  let resp;
  try {
    resp = await fetchWithRetry(url, headers);
  } catch (e) {
    res.status(502).json({ error: "Nem sikerült elérni a Semantic Scholar API-t.", detail: String(e) });
    return;
  }

  if (!resp.ok) {
    const detail = await resp.text();
    res.status(resp.status).json({ error: `Semantic Scholar API hiba (${resp.status})`, detail });
    return;
  }

  const data = await resp.json();
  const items = data.data || [];
  const results = items.map((item) => mapPaper(item[nestedField])).filter(Boolean);

  res.status(200).json({ results });
};
