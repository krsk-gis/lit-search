// Vercel Serverless Function: /api/semanticscholar
// Proxyzza a Semantic Scholar API-t szerver-oldalról, mert az API nem küld
// CORS fejlécet, így böngészőből közvetlenül nem hívható. A SEMANTIC_SCHOLAR_API_KEY
// opcionális - ha be van állítva (Vercel Environment Variables), magasabb
// rate limitet kapunk, ha nincs, a kulcs nélküli (erősen korlátozott)
// publikus keretet használja az API. A rate limit még kulccsal is szigorú
// (kb. 1 kérés/másodperc), ezért a lapozó kérések között várunk, és egy
// esetleges 429-et is újrapróbálunk.

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url, headers) {
  // A kulcsos limit is csak 1 kérés/mp, endpointokon átívelően összesítve -
  // ez nagyon szűk tartalék, és mivel minden keresés egy külön, egymásról
  // nem tudó szerverless-hívás, két külön keresés is összeakadhat egymással.
  // Ezért többször, egyre hosszabb várakozással próbálkozunk, a Vercel
  // function időkorlátján (lásd vercel.json) belül maradva.
  const delays = [1500, 2500, 4000];
  let resp = await fetch(url, { headers });
  for (const delay of delays) {
    if (resp.status !== 429) break;
    await sleep(delay);
    resp = await fetch(url, { headers });
  }
  return resp;
}

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
  // ezért 200-ig offset alapú lapozással kérjük le a maradékot, a kérések
  // között egy kis szünettel, hogy ne fussunk bele a másodpercenkénti limitbe.
  const results = [];
  let offset = 0;
  let first = true;
  while (results.length < count) {
    if (!first) await sleep(1100);
    first = false;

    const params = new URLSearchParams({
      query: topic,
      limit: String(Math.min(count - results.length, 100)),
      offset: String(offset),
      fields: "title,year,authors,venue,citationCount,externalIds,url,openAccessPdf",
    });
    if (yearFrom || yearTo) params.set("year", `${yearFrom || ""}-${yearTo || ""}`);

    let resp;
    try {
      resp = await fetchPage(`https://api.semanticscholar.org/graph/v1/paper/search?${params}`, headers);
    } catch (e) {
      res.status(502).json({ error: "Nem sikerült elérni a Semantic Scholar API-t.", detail: String(e) });
      return;
    }

    if (!resp.ok) {
      const detail = await resp.text();
      const keyState = process.env.SEMANTIC_SCHOLAR_API_KEY ? "kulcs beállítva" : "NINCS kulcs beállítva";
      res.status(resp.status).json({ error: `Semantic Scholar API hiba (${resp.status}) [${keyState}]`, detail });
      return;
    }

    const data = await resp.json();
    const items = data.data || [];
    if (!items.length) break;

    for (const p of items) {
      const authorNames = (p.authors || []).map((a) => a.name).filter(Boolean);
      const doi = (p.externalIds && p.externalIds.DOI) || "";
      const link = p.url || (doi ? `https://doi.org/${doi}` : "#");
      const oaUrl = (p.openAccessPdf && p.openAccessPdf.url) || null;
      results.push({
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
      });
      if (results.length >= count) break;
    }
    offset += items.length;
    if (items.length < 100) break;
  }

  res.status(200).json({ results });
};
