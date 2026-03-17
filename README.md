# MyKP Search Portal

Landing page and search results for the MyKP search experience, with autocomplete, topic routing, and KAI chat mode.

## Run

Open `index.html` or `results.html` in a browser. For full URL routing (e.g. `?q=health+benefits&topic=health-benefits`), use a local server:

```bash
npx serve .
# or: python -m http.server 8000
```

## Unit Tests

Tests cover the search core logic (normalization, typo correction, intent ranking, query analysis).

```bash
npm test
```

## Project Structure

- `index.html` – Landing page with search bar and chips
- `results.html` – Results page with topic content, KAI chat, sources
- `js/search-core.js` – Pure search logic (testable)
- `tests/search.test.js` – Unit tests
