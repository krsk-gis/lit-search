# lit-search

Élő szakirodalom-kereső: beírsz egy témát/kulcsszavakat, és relevancia,
hivatkozásszám vagy dátum szerint rendezve visszaadja a legjobb (max. 100)
találatot az [OpenAlex](https://openalex.org) és a **Scopus** adatbázisából,
egyedi listára szűrve (DOI/cím alapú deduplikáció).

- **OpenAlex**: közvetlenül a böngészőből hívjuk, kulcs nélkül (nyilvános,
  CORS-barát API).
- **Scopus**: az `X-ELS-APIKey` titkos, ezért nem kerülhet a böngészőbe. A
  `functions/api/scopus.js` egy szerver-oldali proxy (Cloudflare Pages
  Function), ami a kulcsot csak szerveroldalon ismeri, és onnan hívja a
  Scopus Search API-t.
- **Semantic Scholar** szándékosan nincs benne: az API-ja nem küld CORS
  fejlécet, így böngészőből közvetlenül nem hívható egy statikus/proxy
  nélküli oldalról. Ehhez (és a Scopushoz is) a repóhoz tartozó helyi CLI
  eszköz használható, ahol nincs CORS-korlát.

## Telepítés (Cloudflare Pages)

A sima GitHub Pages statikus hosting nem tud szerver-oldali function-t
futtatni, ezért ez a projekt **Cloudflare Pages**-re van szánva (ingyenes,
GitHub-integrációval, és támogatja a `functions/` mappát).

1. Regisztrálj / jelentkezz be a [Cloudflare Dashboardba](https://dash.cloudflare.com).
2. **Workers & Pages → Create → Pages → Connect to Git**, válaszd ki ezt a
   repót (`krsk-gis/lit-search`).
3. Build beállítások: nincs szükség build parancsra, a **build output
   directory** legyen `/` (gyökér).
4. **Settings → Environment variables** (Production): adj hozzá egy
   **Secret** típusú változót `ELSEVIER_API_KEY` néven, értéke a Scopus
   API-kulcsod.
5. **Deploy.** Ezután a `https://lit-search.pages.dev` (vagy a Cloudflare
   által adott domain) alatt élesben fut az oldal, a Scopus keresés a saját
   `/api/scopus` végponton keresztül, kulcs-expózás nélkül.

Ha módosítod a kódot és pusholsz a `main`-re, a Cloudflare automatikusan
újra deployol.
