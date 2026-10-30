import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAllRows, loadAnswersForResponses } from './resultPagination.js';

test('result rows continue past one Data API page', async () => {
  const source = Array.from({ length: 1001 }, (_, id) => ({ id }));
  const rows = await loadAllRows(() => ({
    range: async (start, end) => ({ data: source.slice(start, end + 1), error: null }),
  }));
  assert.equal(rows.length, 1001);
  assert.equal(rows.at(-1).id, 1000);
});

test('result rows continue when the configured server limit is smaller than the requested range', async () => {
  const source = Array.from({ length: 7 }, (_, id) => ({ id }));
  const rows = await loadAllRows(() => ({
    range: async (start) => ({ data: source.slice(start, start + 2), error: null }),
  }), 5);
  assert.deepEqual(rows.map((row) => row.id), [0, 1, 2, 3, 4, 5, 6]);
});

test('answers are complete when response and row batches both overflow', async () => {
  const responseIds = Array.from({ length: 41 }, (_, index) => `response-${index}`);
  const source = responseIds.flatMap((responseId) => Array.from({ length: 30 }, (_, index) => ({
    response_id: responseId, question_id: `question-${index}`, value: '답변',
  })));
  const client = {
    from: () => {
      let ids = [];
      const query = {
        select: () => query,
        in: (_column, values) => { ids = values; return query; },
        order: () => query,
        range: async (start, end) => ({
          data: source.filter((answer) => ids.includes(answer.response_id)).slice(start, end + 1),
          error: null,
        }),
      };
      return query;
    },
  };

  const answers = await loadAnswersForResponses(client, responseIds);
  assert.equal(answers.length, 1230);
  assert.equal(answers.at(-1).response_id, 'response-40');
});
