import test from 'node:test';
import assert from 'node:assert/strict';
import { getSurveyPublishError } from './surveyValidation.js';

const validQuestion = {
  prompt: '사용 경험은 어떠셨나요?',
  type: 'single',
  options: ['좋아요', '보통이에요'],
};

// 정상적인 제목과 질문 구성은 발행 검증을 통과합니다.
test('valid survey passes publication validation', () => {
  assert.equal(getSurveyPublishError('사용자 설문', [validQuestion]), '');
});

// 제목은 필수이며 허용 길이를 넘을 수 없습니다.
test('title is required and limited to 120 characters', () => {
  assert.match(getSurveyPublishError('   ', [validQuestion]), /제목/);
  assert.match(getSurveyPublishError('가'.repeat(121), [validQuestion]), /120자/);
});

// 발행 설문은 질문을 최소 1개, 최대 100개 포함해야 합니다.
test('at least one question is required and question count is limited', () => {
  assert.match(getSurveyPublishError('설문', []), /하나 이상/);
  assert.match(getSurveyPublishError('설문', Array.from({ length: 101 }, () => validQuestion)), /100개/);
});

// 질문 내용은 필수이며 최대 300자입니다.
test('question prompt is required and limited to 300 characters', () => {
  assert.match(getSurveyPublishError('설문', [{ ...validQuestion, prompt: '  ' }]), /질문 내용/);
  assert.match(getSurveyPublishError('설문', [{ ...validQuestion, prompt: '가'.repeat(301) }]), /300자/);
});

// 선택형 문항에는 비어 있지 않은 서로 다른 선택지가 2개 이상 필요합니다.
test('choice questions require two nonempty, unique options of up to 120 characters', () => {
  assert.match(getSurveyPublishError('설문', [{ ...validQuestion, options: ['하나'] }]), /선택지/);
  assert.match(getSurveyPublishError('설문', [{ ...validQuestion, options: ['같음', '같음'] }]), /선택지/);
  assert.match(getSurveyPublishError('설문', [{ ...validQuestion, options: ['하나', '  '] }]), /선택지/);
  assert.match(getSurveyPublishError('설문', [{ ...validQuestion, options: ['가'.repeat(121), '둘'] }]), /120자/);
});

// 주관식 문항은 선택지를 설정하지 않아도 발행할 수 있습니다.
test('text questions do not require choice options', () => {
  assert.equal(getSurveyPublishError('설문', [{ prompt: '의견을 알려주세요', type: 'text', options: [] }]), '');
});

// 지원하지 않는 질문 유형은 유효한 문항으로 처리하지 않습니다.
test('unknown question types are rejected', () => {
  assert.match(getSurveyPublishError('설문', [{ ...validQuestion, type: 'other' }]), /유형/);
});
