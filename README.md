# lit-search (v2.0)

Élő szakirodalom-kereső: beírsz egy témát/kulcsszavakat, és relevancia,
hivatkozásszám vagy dátum szerint rendezve visszaadja a legjobb (max. 200)
találatot négy adatbázisból egyszerre - **OpenAlex**, **Scopus**,
**Semantic Scholar**, **Crossref** -, egyedi listára szűrve (DOI/cím alapú
deduplikáció).

- **Nyílt hozzáférés jelzés**: ha az OpenAlex vagy a Semantic Scholar szerint
  van szabadon elérhető teljes szöveg, egy zöld "Nyílt hozzáférés" jelölés
  linkel rá. A Scopus és a Crossref nem ad megbízható per-cikk OA jelzést,
  ott ez nem jelenik meg.
- **BibTeX / RIS export**: a találati lista a "BibTeX letöltése" / "RIS
  letöltése" gombbal fájlba menthető (kliens-oldalon generálva, a már
  lekért adatokból).

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
