import test from 'node:test';
import assert from 'node:assert/strict';
import { hasMeaningfulAnswer, summarizeQuestion } from './resultAnalytics.js';

// 선택하지 않았거나 공백인 답변은 질문별 유효 응답 수에서 제외합니다.
test('optional empty values are not counted as answers', () => {
  assert.equal(hasMeaningfulAnswer(''), false);
  assert.equal(hasMeaningfulAnswer('  \n'), false);
  assert.equal(hasMeaningfulAnswer([]), false);
  assert.equal(hasMeaningfulAnswer(null), false);
  assert.equal(hasMeaningfulAnswer('답변'), true);
  assert.equal(hasMeaningfulAnswer(['선택']), true);
});

// 단일 선택은 실제로 답한 사람만 분모에 포함합니다.
test('single-choice summary excludes skipped answers and uses answered respondents as denominator', () => {
  const summary = summarizeQuestion(
    { id: 'q1', type: 'single', prompt: '만족도', options: ['좋음', '보통', '아쉬움'] },
    [
      { question_id: 'q1', response_id: 'r1', value: '좋음' },
      { question_id: 'q1', response_id: 'r2', value: '보통' },
      { question_id: 'q1', response_id: 'r3', value: '' },
      { question_id: 'other', response_id: 'r4', value: '좋음' },
    ],
    [],
  );

  assert.equal(summary.total, 2);
  assert.deepEqual(summary.options, [
    { label: '좋음', count: 1, percentage: 50 },
    { label: '보통', count: 1, percentage: 50 },
    { label: '아쉬움', count: 0, percentage: 0 },
  ]);
});

// 복수 선택은 응답자별 선택 비율이므로 항목별 비율 합계가 100%를 넘을 수 있습니다.
test('multi-choice percentages describe respondents and can add up to over 100%', () => {
  const summary = summarizeQuestion(
    { id: 'q2', type: 'multiple', prompt: '선호', options: ['차', '커피', '물'] },
    [
      { question_id: 'q2', response_id: 'r1', value: ['차', '커피'] },
      { question_id: 'q2', response_id: 'r2', value: ['차'] },
      { question_id: 'q2', response_id: 'r3', value: [] },
    ],
    [],
  );

  assert.equal(summary.total, 2);
  assert.deepEqual(summary.options, [
    { label: '차', count: 2, percentage: 100 },
    { label: '커피', count: 1, percentage: 50 },
    { label: '물', count: 0, percentage: 0 },
  ]);
});

// 공백 주관식 응답을 제외하고 제출 시각을 해당 답변에 연결합니다.
test('text summary omits blank answers and associates submission times', () => {
  const summary = summarizeQuestion(
    { id: 'q3', type: 'text', prompt: '의견' },
    [
      { question_id: 'q3', response_id: 'r1', value: '좋았어요' },
      { question_id: 'q3', response_id: 'r2', value: '   ' },
    ],
    [{ id: 'r1', submitted_at: '2026-01-01T10:00:00Z' }],
  );

  assert.equal(summary.total, 1);
  assert.deepEqual(summary.textAnswers, [
    { id: 'r1', value: '좋았어요', submittedAt: '2026-01-01T10:00:00Z' },
  ]);
});
