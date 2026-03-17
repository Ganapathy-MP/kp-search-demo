/**
 * Unit tests for KP Search core logic.
 * Run with: node --test tests/search.test.js
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  normalizeText,
  escapeHtml,
  levenshteinDistance,
  scoreCandidate,
  rankIntents,
  analyzeQuery,
  highlightSuggestion
} = require('../js/search-core.js');

var TEST_INTENTS = [
  { topic: 'health-benefits', query: 'What are my health benefits', aliases: ['health benifits', 'medical benefits'], expansions: ['benefits'], popular: true },
  { topic: 'tort', query: 'How do I use TORT', aliases: ['tort', 'time off request tracking'], expansions: ['tort'], popular: false },
  { topic: 'time-off', query: 'What are my time off balances', aliases: ['time of', 'pto balance'], expansions: ['pto'], popular: true },
  { topic: 'retirement', query: 'Show my retirement benefits', aliases: ['retirment', '401k'], expansions: ['retirement'], popular: false }
];

describe('normalizeText', () => {
  it('lowercases and trims', () => {
    assert.strictEqual(normalizeText('  HEALTH Benefits  '), 'health benefits');
  });

  it('normalizes typos', () => {
    assert.strictEqual(normalizeText('health benifits'), 'health benefits');
    assert.strictEqual(normalizeText('retirment'), 'retirement');
    assert.strictEqual(normalizeText('time of'), 'time off');
  });

  it('handles empty/null', () => {
    assert.strictEqual(normalizeText(''), '');
    assert.strictEqual(normalizeText(null), '');
    assert.strictEqual(normalizeText(undefined), '');
  });

  it('collapses whitespace', () => {
    assert.strictEqual(normalizeText('health   benefits'), 'health benefits');
  });
});

describe('escapeHtml', () => {
  it('escapes < and >', () => {
    assert.strictEqual(escapeHtml('<script>'), '&lt;script&gt;');
  });

  it('escapes quotes', () => {
    assert.strictEqual(escapeHtml('"test"'), '&quot;test&quot;');
  });

  it('handles empty/null', () => {
    assert.strictEqual(escapeHtml(''), '');
    assert.strictEqual(escapeHtml(null), '');
  });
});

describe('levenshteinDistance', () => {
  it('returns 0 for identical strings', () => {
    assert.strictEqual(levenshteinDistance('benefits', 'benefits'), 0);
  });

  it('returns correct distance for typos', () => {
    assert.strictEqual(levenshteinDistance('benifits', 'benefits'), 1);
    assert.strictEqual(levenshteinDistance('benefits', 'benifits'), 1);
  });

  it('handles empty strings', () => {
    assert.strictEqual(levenshteinDistance('', 'hello'), 5);
    assert.strictEqual(levenshteinDistance('hello', ''), 5);
  });
});

describe('scoreCandidate', () => {
  it('returns 1 for exact match', () => {
    assert.strictEqual(scoreCandidate('health benefits', 'health benefits'), 1);
  });

  it('returns high score for substring match', () => {
    assert.ok(scoreCandidate('health', 'health benefits') >= 0.9);
  });

  it('returns 0 for null/empty', () => {
    assert.strictEqual(scoreCandidate('', 'health'), 0);
    assert.strictEqual(scoreCandidate('health', ''), 0);
  });

  it('returns reasonable score for typo', () => {
    var score = scoreCandidate('benifits', 'benefits');
    assert.ok(score > 0.5 && score < 1);
  });
});

describe('rankIntents', () => {
  it('returns empty for empty query', () => {
    assert.deepStrictEqual(rankIntents('', TEST_INTENTS), []);
  });

  it('ranks health benefits query correctly', () => {
    var ranked = rankIntents('health benifits', TEST_INTENTS);
    assert.ok(ranked.length > 0);
    assert.strictEqual(ranked[0].intent.topic, 'health-benefits');
    assert.ok(ranked[0].score > 0.5);
  });

  it('ranks TORT query correctly', () => {
    var ranked = rankIntents('tort', TEST_INTENTS);
    assert.ok(ranked.length > 0);
    assert.strictEqual(ranked[0].intent.topic, 'tort');
  });

  it('normalizes time of to time off', () => {
    var ranked = rankIntents('time of balance', TEST_INTENTS);
    assert.ok(ranked.length > 0);
    assert.strictEqual(ranked[0].intent.topic, 'time-off');
  });
});

describe('analyzeQuery', () => {
  it('returns empty for low confidence', () => {
    var result = analyzeQuery('xyz random gibberish', TEST_INTENTS);
    assert.strictEqual(result.topic, '');
    assert.strictEqual(result.confidence, 0);
  });

  it('returns topic and corrected query for typo', () => {
    var result = analyzeQuery('health benifits', TEST_INTENTS);
    assert.strictEqual(result.topic, 'health-benefits');
    assert.ok(result.confidence >= 0.45);
    assert.strictEqual(result.correctedQuery, 'What are my health benefits');
  });

  it('returns topic without correction for exact match', () => {
    var result = analyzeQuery('What are my health benefits', TEST_INTENTS);
    assert.strictEqual(result.topic, 'health-benefits');
    assert.strictEqual(result.correctedQuery, '');
  });
});

describe('highlightSuggestion', () => {
  it('wraps match in mark', () => {
    var html = highlightSuggestion('health benefits', 'health');
    assert.ok(html.includes('<mark>'));
    assert.ok(html.includes('health'));
  });

  it('escapes HTML', () => {
    var html = highlightSuggestion('<script>', 'script');
    assert.ok(html.includes('&lt;'));
  });

  it('returns escaped text when no match', () => {
    var html = highlightSuggestion('health benefits', 'xyz');
    assert.strictEqual(html, 'health benefits');
  });
});
