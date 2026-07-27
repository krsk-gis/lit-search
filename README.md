# lit-search

Élő szakirodalom-kereső: beírsz egy témát/kulcsszavakat, és relevancia,
hivatkozásszám vagy dátum szerint rendezve visszaadja a legjobb (max. 100)
találatot az [OpenAlex](https://openalex.org) és a
[Semantic Scholar](https://www.semanticscholar.org) adatbázisából, egyedi
listára szűrve (DOI/cím alapú deduplikáció).

Nincs build lépés, nincs backend — egyetlen statikus `index.html`, amit a
böngésző közvetlenül hív a két nyilvános, kulcs nélkül elérhető API ellen.
GitHub Pages-en publikálva fut.

## Miért nincs benne a Scopus?

A Scopus (Elsevier) API-hoz kulcs kell, a GitHub Pages viszont csak statikus
tartalmat szolgál ki — nincs szerver, ami el tudná rejteni a kulcsot, így az
a publikus JavaScript kódban mindenki számára láthatóvá válna. Scopus
kereséshez a `lit-search` mellett készült helyi CLI eszköz használható,
amely a kulcsot környezeti változóból olvassa.
