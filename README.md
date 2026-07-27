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
  fejlécet, így böngészőből közvetlenül nem hívható. Ehhez (és a Scopushoz
  is) a repóhoz tartozó helyi CLI eszköz használható, ahol nincs
  CORS-korlát.

## Telepítés (Cloudflare Pages)

A sima GitHub Pages statikus hosting nem tud szerver-oldali function-t
futtatni, ezért ez a projekt **Cloudflare Pages**-re van szánva (ingyenes,
GitHub-integrációval, és automatikusan felismeri a `functions/` mappát mint
API végpontokat).

1. Cloudflare Dashboard → a `lit-search` Pages projekt.
2. **Settings → Builds & deployments**: a **Build output directory** legyen
   `/` (a repó gyökere) - itt van az `index.html`. Ha korábban `public`-ra
   vagy másra volt állítva, ezért jött üres/fehér oldal.
3. **Settings → Environment variables** (Production): adj hozzá egy
   **Secret** típusú változót `ELSEVIER_API_KEY` néven, értéke a Scopus
   API-kulcsod.
4. Mentés után egy új deploy indul (vagy indíts egyet kézzel a
   **Deployments** fülön: **Retry deployment** / **Create deployment**).

Ezután a `lit-search.pages.dev` alatt élesben fut az oldal: OpenAlex
közvetlenül a böngészőből, Scopus a saját `/api/scopus` végponton keresztül,
kulcs-expózás nélkül. Ha módosítod a kódot és pusholsz a `main`-re, a
Cloudflare automatikusan újra deployol.
