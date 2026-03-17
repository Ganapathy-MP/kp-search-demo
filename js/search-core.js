/**
 * KP Search Core Logic - Pure functions for search/topic routing.
 * Used by index.html and results.html. Testable in Node.
 */
(function (global) {
  'use strict';

  var TYPO_NORMALIZATION_MAP = {
    benifits: 'benefits',
    benfits: 'benefits',
    benefiits: 'benefits',
    casses: 'cases',
    retirment: 'retirement',
    preperation: 'preparation',
    calender: 'calendar'
  };

  function normalizeText(value) {
    var normalized = (value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!normalized) return '';
    normalized = normalized.replace(/\btime of\b/g, 'time off');
    return normalized.split(' ').map(function (token) {
      return TYPO_NORMALIZATION_MAP[token] || token;
    }).join(' ').trim();
  }

  function escapeHtml(value) {
    return (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function levenshteinDistance(a, b) {
    var source = a || '';
    var target = b || '';
    var matrix = [];
    var i, j;

    if (!source.length) return target.length;
    if (!target.length) return source.length;

    for (i = 0; i <= target.length; i += 1) {
      matrix[i] = [i];
    }
    for (j = 0; j <= source.length; j += 1) {
      matrix[0][j] = j;
    }

    for (i = 1; i <= target.length; i += 1) {
      for (j = 1; j <= source.length; j += 1) {
        if (target.charAt(i - 1) === source.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[target.length][source.length];
  }

  function scoreCandidate(query, candidate) {
    if (!query || !candidate) return 0;
    if (query === candidate) return 1;
    if (candidate.indexOf(query) !== -1) return 0.93;
    if (query.indexOf(candidate) !== -1) return 0.87;

    var queryTokens = query.split(' ');
    var candidateTokens = candidate.split(' ');
    var overlapCount = 0;
    queryTokens.forEach(function (token) {
      if (candidateTokens.indexOf(token) !== -1) overlapCount += 1;
    });

    var overlapScore = overlapCount / Math.max(queryTokens.length, candidateTokens.length);
    var editDistance = levenshteinDistance(query, candidate);
    var editScore = 1 - (editDistance / Math.max(query.length, candidate.length));
    var blended = (overlapScore * 0.78) + (editScore * 0.42);
    return Math.max(0, Math.min(1, Math.max(blended, editScore * 0.65)));
  }

  function rankIntents(rawQuery, searchIntents) {
    var query = normalizeText(rawQuery);
    if (!query || !searchIntents || !searchIntents.length) return [];

    var ranked = searchIntents.map(function (intent) {
      var candidates = [intent.query].concat(intent.aliases || []);
      var bestScore = 0;

      candidates.forEach(function (candidate) {
        var score = scoreCandidate(query, normalizeText(candidate));
        if (score > bestScore) bestScore = score;
      });

      return { intent: intent, score: bestScore };
    });

    return ranked.sort(function (a, b) { return b.score - a.score; });
  }

  function analyzeQuery(rawQuery, searchIntents) {
    var ranked = rankIntents(rawQuery, searchIntents);
    var query = normalizeText(rawQuery);
    if (!ranked.length || ranked[0].score < 0.24) {
      return {
        topic: '',
        confidence: 0,
        canonicalQuery: '',
        correctedQuery: '',
        expansions: []
      };
    }

    var top = ranked[0];
    var corrected = '';
    if (query && normalizeText(top.intent.query) !== query && top.score >= 0.45) {
      corrected = top.intent.query;
    }

    return {
      topic: top.intent.topic,
      confidence: top.score,
      canonicalQuery: top.intent.query,
      correctedQuery: corrected,
      expansions: top.intent.expansions || []
    };
  }

  function highlightSuggestion(text, rawQuery) {
    var query = (rawQuery || '').trim();
    if (!query) return escapeHtml(text);
    var start = text.toLowerCase().indexOf(query.toLowerCase());
    if (start === -1) return escapeHtml(text);
    var end = start + query.length;
    return escapeHtml(text.slice(0, start)) +
      '<mark>' + escapeHtml(text.slice(start, end)) + '</mark>' +
      escapeHtml(text.slice(end));
  }

  var api = {
    normalizeText: normalizeText,
    escapeHtml: escapeHtml,
    levenshteinDistance: levenshteinDistance,
    scoreCandidate: scoreCandidate,
    rankIntents: rankIntents,
    analyzeQuery: analyzeQuery,
    highlightSuggestion: highlightSuggestion,
    TYPO_NORMALIZATION_MAP: TYPO_NORMALIZATION_MAP
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.KPSearchCore = api;
  }
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
