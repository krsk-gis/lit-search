# lit-search

Élő szakirodalom-kereső: beírsz egy témát/kulcsszavakat, és relevancia,
hivatkozásszám vagy dátum szerint rendezve visszaadja a legjobb (max. 100)
találatot az [OpenAlex](https://openalex.org) és a **Scopus** adatbázisából,
egyedi listára szűrve (DOI/cím alapú deduplikáció).

- **OpenAlex**: közvetlenül a böngészőből hívjuk, kulcs nélkül (nyilvános,
  CORS-barát API).
- **Scopus**: az `X-ELS-APIKey` titkos, ezért nem kerülhet a böngészőbe. Az
  `api/scopus.js` egy szerver-oldali proxy (Vercel Serverless Function), ami
  a kulcsot csak szerveroldalon ismeri, és onnan hívja a Scopus Search
  API-t - ugyanazzal a lekérdezés-felépítéssel, mint a bizonyítottan működő
  `articles-monitor` repó heti szkriptje (idézőjeles kifejezés, explicit
  `sort`, `X-ELS-APIKey` header).
- **Semantic Scholar** szándékosan nincs benne: az API-ja nem küld CORS
  fejlécet, így böngészőből közvetlenül nem hívható. Ehhez (és a Scopushoz
  is) a repóhoz tartozó helyi CLI eszköz használható, ahol nincs
  CORS-korlát.

Korábban a proxy Cloudflare Pages-en futott, de az Elsevier API
következetesen `GENERAL_SYSTEM_ERROR`-t adott vissza kizárólag a
Cloudflare-ről érkező kéréseknél - ugyanaz a lekérdezés közvetlen
böngészős (nem Cloudflare) tesztben és a Cloudflare nélküli proxyn is
hibátlanul működött, ami arra utal, hogy az Elsevier blokkolja/máshogy
kezeli a Cloudflare Workers-ről érkező forgalmat. Ezért a proxy most
**Vercel**-en fut.

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
   üresen/alapértelmezetten - nincs build lépés, az `index.html` a
   gyökérben van, az `api/scopus.js` automatikusan function lesz.
4. **Environment Variables**: adj hozzá egy változót `ELSEVIER_API_KEY`
   néven, értéke a Scopus API-kulcsod (Production + Preview + Development
   mindegyikhez, vagy legalább Productionhoz).
5. **Deploy.**

Ezután a Vercel által adott domainen (pl. `lit-search.vercel.app`) fut az
oldal: OpenAlex közvetlenül a böngészőből, Scopus a saját `/api/scopus`
végponton keresztül, kulcs-expózás nélkül. Ha módosítod a kódot és pusholsz
a `main`-re, a Vercel automatikusan újra deployol.
