// Vercel Serverless Function: /api/semanticscholar
// Proxyzza a Semantic Scholar API-t szerver-oldalról, mert az API nem küld
// CORS fejlécet, így böngészőből közvetlenül nem hívható. A SEMANTIC_SCHOLAR_API_KEY
// opcionális - ha be van állítva (Vercel Environment Variables), magasabb
// rate limitet kapunk, ha nincs, a kulcs nélküli (erősen korlátozott)
// publikus keretet használja az API.

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const { topic, count: countParam, yearFrom, yearTo } = req.query;
  if (!topic) {
    res.status(400).json({ error: 'Hiányzó "topic" paraméter.' });
    return;
  }

  const count = Math.min(parseInt(countParam, 10) || 50, 200);

  const headers = {};
  if (process.env.SEMANTIC_SCHOLAR_API_KEY) headers["x-api-key"] = process.env.SEMANTIC_SCHOLAR_API_KEY;

  // A Semantic Scholar /paper/search egy híváson belül max 100 találatot ad,
  // ezért 200-ig offset alapú lapozással kérjük le a maradékot.
  const results = [];
  let offset = 0;
  while (results.length < count) {
    const params = new URLSearchParams({
      query: topic,
      limit: String(Math.min(count - results.length, 100)),
      offset: String(offset),
      fields: "title,year,authors,venue,citationCount,externalIds,url",
    });
    if (yearFrom || yearTo) params.set("year", `${yearFrom || ""}-${yearTo || ""}`);

    let resp;
    try {
      resp = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?${params}`, { headers });
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
    if (!items.length) break;

    for (const p of items) {
      const authors = p.authors || [];
      const doi = (p.externalIds && p.externalIds.DOI) || "";
      const link = p.url || (doi ? `https://doi.org/${doi}` : "#");
      results.push({
        title: p.title || "Nincs cím",
        author: authors.length ? authors[0].name : "N/A",
        year: p.year ? String(p.year) : "",
        journal: p.venue || "",
        citations: p.citationCount || 0,
        link,
        doi,
        source: "Semantic Scholar",
      });
      if (results.length >= count) break;
    }
    offset += items.length;
    if (items.length < 100) break;
  }

  res.status(200).json({ results });
};
