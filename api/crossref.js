// Vercel Serverless Function: /api/crossref
// Proxyzza a Crossref works API-t szerver-oldalról (kulcs nem kell hozzá,
// de a konzisztencia és a CORS-bizonytalanság elkerülése miatt itt is
// proxy-n keresztül hívjuk, mint a többi forrást).

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

  const sortMap = { relevance: "relevance", citations: "is-referenced-by-count", date: "published" };
  const params = new URLSearchParams({
    "query.title": topic,
    rows: String(count),
    sort: sortMap[sort],
    order: "desc",
    select: "title,author,published,container-title,is-referenced-by-count,DOI,URL",
  });

  const filters = [];
  if (yearFrom) filters.push(`from-pub-date:${yearFrom}-01-01`);
  if (yearTo) filters.push(`until-pub-date:${yearTo}-12-31`);
  if (filters.length) params.set("filter", filters.join(","));

  let resp;
  try {
    resp = await fetch(`https://api.crossref.org/works?${params}`);
  } catch (e) {
    res.status(502).json({ error: "Nem sikerült elérni a Crossref API-t.", detail: String(e) });
    return;
  }

  if (!resp.ok) {
    const detail = await resp.text();
    res.status(resp.status).json({ error: `Crossref API hiba (${resp.status})`, detail });
    return;
  }

  const data = await resp.json();
  const items = (data.message && data.message.items) || [];

  const results = items.map((item) => {
    const author = (item.author || [])[0];
    const authorName = author ? `${author.given || ""} ${author.family || ""}`.trim() : "N/A";
    const year = item.published && item.published["date-parts"] && item.published["date-parts"][0]
      ? String(item.published["date-parts"][0][0])
      : "";
    const doi = item.DOI || "";
    return {
      title: (item.title && item.title[0]) || "Nincs cím",
      author: authorName || "N/A",
      year,
      journal: (item["container-title"] && item["container-title"][0]) || "",
      citations: item["is-referenced-by-count"] || 0,
      link: item.URL || (doi ? `https://doi.org/${doi}` : "#"),
      doi,
      source: "Crossref",
    };
  });

  res.status(200).json({ results });
};
