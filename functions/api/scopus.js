// Cloudflare Pages Function: /api/scopus
// Proxyzza a Scopus (Elsevier) Search API-t úgy, hogy az ELSEVIER_API_KEY
// soha nem kerül a kliens (böngésző) oldalra - csak ez a function ismeri,
// a Cloudflare Pages projekt titkos környezeti változójaként tárolva.

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders() });
}

function buildQuery(topic, raw, yearFrom, yearTo) {
  const phrase = topic.replace(/"/g, "");
  let query = raw ? topic : `TITLE-ABS-KEY("${phrase}")`;
  if (yearFrom) query += ` AND PUBYEAR > ${yearFrom - 1}`;
  if (yearTo) query += ` AND PUBYEAR < ${yearTo + 1}`;
  return query;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const topic = url.searchParams.get("topic");
  if (!topic) return json({ error: 'Hiányzó "topic" paraméter.' }, 400);

  const apiKey = env.ELSEVIER_API_KEY;
  if (!apiKey) return json({ error: "A szerver nincs konfigurálva (hiányzó ELSEVIER_API_KEY)." }, 500);

  const raw = url.searchParams.get("raw") === "1";
  const sort = url.searchParams.get("sort") || "relevance";
  const count = Math.min(parseInt(url.searchParams.get("count") || "50", 10) || 50, 100);
  const yearFrom = parseInt(url.searchParams.get("yearFrom"), 10) || null;
  const yearTo = parseInt(url.searchParams.get("yearTo"), 10) || null;

  const sortMap = { relevance: null, citations: "-citedby-count", date: "-coverDate" };
  const query = buildQuery(topic, raw, yearFrom, yearTo);

  const results = [];
  let start = 0;
  while (results.length < count) {
    const params = new URLSearchParams({ query, count: String(Math.min(count - results.length, 25)), start: String(start) });
    if (sortMap[sort]) params.set("sort", sortMap[sort]);

    let resp;
    try {
      resp = await fetch(`https://api.elsevier.com/content/search/scopus?${params}`, {
        headers: { "X-ELS-APIKey": apiKey, Accept: "application/json" },
      });
    } catch (e) {
      return json({ error: "Nem sikerült elérni a Scopus API-t.", detail: String(e) }, 502);
    }

    if (!resp.ok) {
      const detail = await resp.text();
      return json({ error: `Scopus API hiba (${resp.status})`, detail }, resp.status);
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

  return json({ results });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
