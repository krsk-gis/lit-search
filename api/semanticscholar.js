// Vercel Serverless Function: /api/semanticscholar
// Proxyzza a Semantic Scholar API-t szerver-oldalról, mert az API nem küld
// CORS fejlécet, így böngészőből közvetlenül nem hívható. A SEMANTIC_SCHOLAR_API_KEY
// opcionális - ha be van állítva, magasabb rate limitet kapunk, ha nincs, a
// kulcs nélküli (erősen korlátozott) publikus keretet használja az API.

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const { topic, sort: sortParam, count: countParam, yearFrom, yearTo } = req.query;
  if (!topic) {
    res.status(400).json({ error: 'Hiányzó "topic" paraméter.' });
    return;
  }

  const sort = sortParam || "relevance";
  const count = Math.min(parseInt(countParam, 10) || 50, 100);

  const params = new URLSearchParams({
    query: topic,
    limit: String(Math.min(count, 100)),
    fields: "title,year,authors,venue,citationCount,externalIds,url",
  });
  if (yearFrom || yearTo) params.set("year", `${yearFrom || ""}-${yearTo || ""}`);

  const headers = {};
  if (process.env.SEMANTIC_SCHOLAR_API_KEY) headers["x-api-key"] = process.env.SEMANTIC_SCHOLAR_API_KEY;

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
  let results = (data.data || []).map((p) => {
    const authors = p.authors || [];
    const doi = (p.externalIds && p.externalIds.DOI) || "";
    const link = p.url || (doi ? `https://doi.org/${doi}` : "#");
    return {
      title: p.title || "Nincs cím",
      author: authors.length ? authors[0].name : "N/A",
      year: p.year ? String(p.year) : "",
      journal: p.venue || "",
      citations: p.citationCount || 0,
      link,
      doi,
      source: "Semantic Scholar",
    };
  });

  if (sort === "citations") results.sort((a, b) => b.citations - a.citations);
  else if (sort === "date") results.sort((a, b) => (b.year || "0").localeCompare(a.year || "0"));

  res.status(200).json({ results });
};
