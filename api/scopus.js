// Vercel Serverless Function: /api/scopus
// Proxyzza a Scopus (Elsevier) Search API-t úgy, hogy az ELSEVIER_API_KEY
// soha nem kerül a kliens (böngésző) oldalra - csak ez a function ismeri,
// a Vercel projekt titkos környezeti változójaként tárolva.

function buildQuery(topic, raw, yearFrom, yearTo) {
  const phrase = String(topic).replace(/"/g, "");
  let query = raw ? topic : `TITLE-ABS-KEY("${phrase}")`;
  if (yearFrom) query += ` AND PUBYEAR > ${yearFrom - 1}`;
  if (yearTo) query += ` AND PUBYEAR < ${yearTo + 1}`;
  return query;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const { topic, count: countParam, yearFrom: yearFromParam, yearTo: yearToParam } = req.query;
  const raw = req.query.raw === "1";

  if (!topic) {
    res.status(400).json({ error: 'Hiányzó "topic" paraméter.' });
    return;
  }

  const apiKey = process.env.ELSEVIER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "A szerver nincs konfigurálva (hiányzó ELSEVIER_API_KEY)." });
    return;
  }

  const count = Math.min(parseInt(countParam, 10) || 50, 100);
  const yearFrom = parseInt(yearFromParam, 10) || null;
  const yearTo = parseInt(yearToParam, 10) || null;

  // A Scopus API rendszerhibát ad, ha a sort paramétert kihagyjuk vagy
  // "relevancy"-t küldünk - -coverDate az egyetlen igazoltan működő érték,
  // ezt használjuk mindig; a hivatkozás/dátum szerinti rendezést a kliens
  // végzi a már lekért találatokon.
  const query = buildQuery(topic, raw, yearFrom, yearTo);

  const results = [];
  let start = 0;
  while (results.length < count) {
    const params = new URLSearchParams({
      query,
      count: String(Math.min(count - results.length, 25)),
      start: String(start),
      sort: "-coverDate",
    });

    let resp;
    try {
      resp = await fetch(`https://api.elsevier.com/content/search/scopus?${params}`, {
        headers: { "X-ELS-APIKey": apiKey, Accept: "application/json" },
      });
    } catch (e) {
      res.status(502).json({ error: "Nem sikerült elérni a Scopus API-t.", detail: String(e) });
      return;
    }

    if (!resp.ok) {
      const detail = await resp.text();
      res.status(resp.status).json({ error: `Scopus API hiba (${resp.status})`, detail });
      return;
    }

    const data = await resp.json();
    const entries = (data["search-results"] && data["search-results"].entry) || [];
    if (!entries.length || entries[0].error) break;

    for (const item of entries) {
      const linkObj = (item.link || []).find((l) => l["@ref"] === "scopus");
      const doi = item["prism:doi"] || "";
      results.push({
        title: item["dc:title"] || "Nincs cím",
        author: item["dc:creator"] || "N/A",
        year: (item["prism:coverDate"] || "").slice(0, 4),
        journal: item["prism:publicationName"] || "",
        citations: parseInt(item["citedby-count"] || "0", 10),
        link: (linkObj && linkObj["@href"]) || (doi ? `https://doi.org/${doi}` : "#"),
        doi,
        source: "Scopus",
      });
      if (results.length >= count) break;
    }
    start += entries.length;
    if (entries.length < 25) break;
  }

  res.status(200).json({ results });
};
