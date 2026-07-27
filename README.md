# lit-search

Élő szakirodalom-kereső: beírsz egy témát/kulcsszavakat, és relevancia,
hivatkozásszám vagy dátum szerint rendezve visszaadja a legjobb (max. 100)
találatot az [OpenAlex](https://openalex.org) és a **Scopus** adatbázisából,
egyedi listára szűrve (DOI/cím alapú deduplikáció).

- **OpenAlex**: közvetlenül a böngészőből hívjuk, kulcs nélkül (nyilvános,
  CORS-barát API).
- **Scopus**: az `X-ELS-APIKey` titkos, ezért nem kerülhet a böngészőbe. A
  `src/worker.js` egy Cloudflare Worker, ami a `/api/scopus` útvonalon
  proxyzza a Scopus Search API-t - a kulcsot csak szerveroldalon ismeri
  (titkos környezeti változóként), és ugyanez a worker szolgálja ki a
  `public/index.html` statikus oldalt is (a `assets` binding-on keresztül).
- **Semantic Scholar** szándékosan nincs benne: az API-ja nem küld CORS
  fejlécet, így böngészőből közvetlenül nem hívható. Ehhez (és a Scopushoz
  is) a repóhoz tartozó helyi CLI eszköz használható, ahol nincs
  CORS-korlát.

## Telepítés (Cloudflare Workers)

A sima GitHub Pages statikus hosting nem tud szerver-oldali kódot futtatni,
ezért ez a projekt **Cloudflare Workers**-re van szánva (ingyenes,
GitHub-integrációval - "Workers Builds" -, egy worker szolgálja ki a
statikus fájlokat és a `/api/scopus` proxyt is).

1. Regisztrálj / jelentkezz be a [Cloudflare Dashboardba](https://dash.cloudflare.com).
2. **Compute (Workers) → Create → Connect to Git**, válaszd ki ezt a repót
   (`krsk-gis/lit-search`), branch: `main`.
3. A build/deploy parancsok maradjanak az alapértelmezettek
   (`npx wrangler deploy` / `npx wrangler versions upload`) - a repóban lévő
   `wrangler.jsonc` mondja meg Wranglernek, mi a worker belépési pontja
   (`src/worker.js`) és hol vannak a statikus fájlok (`public/`).
4. Az **"API token"** mezőnél kattints a **"Create new token"**-re és adj
   neki egy tetszőleges nevet - ez a Cloudflare saját deploy-tokenje, hogy a
   Git-integráció tudjon deployolni, **nem** a Scopus kulcs.
5. **Deploy.**
6. Az első deploy után: a worker **Settings → Variables and Secrets**
   menüjében adj hozzá egy **Secret** típusú változót `ELSEVIER_API_KEY`
   néven, értéke a Scopus API-kulcsod, majd mentsd el (ez újra deployolja a
   workert a titokkal).

Ezután a Cloudflare által adott domainen (pl. `lit-search.<account>.workers.dev`)
élesben fut az oldal, OpenAlex + Scopus kereséssel, kulcs-expózás nélkül. Ha
módosítod a kódot és pusholsz a `main`-re, a Cloudflare automatikusan újra
deployol.
