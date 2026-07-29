# lit-search (v2.7)

Élő szakirodalom-kereső: beírsz egy témát/kulcsszavakat és/vagy egy szerzőt,
és relevancia, hivatkozásszám vagy dátum szerint rendezve visszaadja a
legjobb (max. 200) találatot négy adatbázisból egyszerre - **OpenAlex**,
**Scopus**, **Semantic Scholar**, **Crossref** -, egyedi listára szűrve
(DOI/cím alapú deduplikáció).

- **Szerző szerinti keresés**: önmagában vagy a témával kombinálva. Scopusnál
  `AUTH()`, OpenAlexnél `raw_author_name.search`, Crossrefnél `query.author`
  szűkíti a lekérdezést; a Semantic Scholar publikus keresőjének nincs külön
  szerző-módja, ott a névvel együtt küldött általános kereséssel megyünk.
  Nincs kliens-oldali utószűrés - próbáltunk kettőt (szó szerinti teljes
  névegyezés, majd vezetéknév+monogram egyezés), de mindkettő inkább kiszűrt
  jó találatokat, mint javított a pontosságon, úgyhogy egyszerűen az egyes
  API-k saját keresésére hagyatkozunk.
- **Nyílt hozzáférés jelzés**: ha az OpenAlex vagy a Semantic Scholar szerint
  van szabadon elérhető teljes szöveg, egy "Nyílt hozzáférés" jelölés
  linkel rá. A Scopus és a Crossref nem ad megbízható per-cikk OA jelzést,
  ott ez nem jelenik meg.
- **BibTeX / Excel (CSV) export**: jelölőnégyzettel kiválasztható, mely
  találatok kerüljenek exportálásra (alapból mind ki van jelölve), majd egy
  kattintással fájlba menthetők (kliens-oldalon generálva). A CSV
  pontosvesszővel tagolt és UTF-8 BOM-mal kezdődik, hogy magyar Excelben is
  helyesen (ékezetekkel, oszlopokra bontva) nyíljon meg.

- **OpenAlex** és **Crossref**: nyilvános, kulcs nélkül hívható API-k.
- **Scopus**: az `X-ELS-APIKey` titkos, ezért nem kerülhet a böngészőbe. Az
  `api/scopus.js` egy szerver-oldali proxy (Vercel Serverless Function), ami
  a kulcsot csak szerveroldalon ismeri.
- **Semantic Scholar**: az API-ja nem küld CORS fejlécet, így böngészőből
  közvetlenül nem hívható - az `api/semanticscholar.js` proxyzza. Opcionális
  API-kulccsal (`SEMANTIC_SCHOLAR_API_KEY`) magasabb rate limitet kapunk,
  kulcs nélkül könnyen 429-et ad a megosztott publikus keret miatt.

Mind a négy forrás mindig aktív - nincs kikapcsolható forrás-választó a
felületen, csak egy tájékoztató sor, hogy éppen melyik adatbázisokból
dolgozik.

## Telepítés (Vercel)

A sima GitHub Pages statikus hosting nem tud szerver-oldali function-t
futtatni, ezért ez a projekt **Vercelre** van szánva (ingyenes,
GitHub-integrációval, automatikusan felismeri az `api/` mappát mint
szerverless function végpontokat).

1. Regisztrálj / jelentkezz be a [vercel.com](https://vercel.com)-on
   (GitHub fiókkal is lehet).
2. **Add New → Project → Import Git Repository**, válaszd ki ezt a repót
   (`krsk-gis/lit-search`).
3. Framework Preset: **Other**. Build Command / Output Directory: hagyd
   üresen/alapértelmezetten - nincs build lépés.
4. **Environment Variables**:
   - `ELSEVIER_API_KEY` - a Scopus API-kulcsod (kötelező a Scopus
     kereséshez).
   - `SEMANTIC_SCHOLAR_API_KEY` - opcionális, de ajánlott a magasabb rate
     limit miatt ([igénylés itt](https://www.semanticscholar.org/product/api#api-key-form)).
5. **Deploy.**

Ha módosítod a kódot és pusholsz a `main`-re, a Vercel automatikusan újra
deployol.
