import test from 'node:test';
import assert from 'node:assert/strict';
import { createSurveyCopyPayload } from './surveyCopy.js';

test('copy creates a new draft payload with new question IDs and no responses', () => {
  const source = { title: '서비스 만족도', description: '안내' };
  const questions = [{ id: 'original-id', prompt: '만족하셨나요?', type: 'single', required: true, options: ['예', '아니요'] }];
  const payload = createSurveyCopyPayload(source, questions, () => 'new-id');
  assert.equal(payload.p_survey_id, null);
  assert.equal(payload.p_title, '서비스 만족도 (복사본)');
  assert.equal(payload.p_questions[0].id, 'new-id');
  assert.equal(questions[0].id, 'original-id');
  assert.equal('responses' in payload, false);
});

test('copy title stays within the publication length limit', () => {
  const payload = createSurveyCopyPayload({ title: '가'.repeat(120) }, [], () => 'id');
  assert.equal(payload.p_title.length, 120);
  assert.ok(payload.p_title.endsWith(' (복사본)'));
});
