import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getEligibleReEvaluationTerm,
  isCourseEligibleForReEvaluation,
  normalizeReEvaluationReason,
  parseReEvaluationGrades
} from '../utils/reEvaluationHelper.js';

test('chỉ cho phúc khảo học kỳ liền trước học kỳ hiện tại', () => {
  assert.equal(getEligibleReEvaluationTerm(5), 4);
  assert.equal(isCourseEligibleForReEvaluation(4, 5), true);
  assert.equal(isCourseEligibleForReEvaluation(3, 5), false);
  assert.equal(isCourseEligibleForReEvaluation(5, 5), false);
  assert.equal(getEligibleReEvaluationTerm(1), null);
});

test('chuẩn hóa lý do phúc khảo', () => {
  assert.equal(normalizeReEvaluationReason('  Cần kiểm tra lại điểm  '), 'Cần kiểm tra lại điểm');
  assert.throws(() => normalizeReEvaluationReason('   '), /bắt buộc/);
  assert.throws(() => normalizeReEvaluationReason('x'.repeat(256)), /255/);
});

test('chỉ chấp nhận ba đầu điểm phúc khảo trong khoảng 0-10', () => {
  assert.deepEqual(parseReEvaluationGrades({
    attendanceGrade: '8.5',
    midtermGrade: 9,
    finalGrade: '10'
  }), {
    attendanceGrade: 8.5,
    midtermGrade: 9,
    finalGrade: 10
  });
  assert.throws(() => parseReEvaluationGrades({
    attendanceGrade: -1,
    midtermGrade: 8,
    finalGrade: 9
  }), /0-10/);
  assert.throws(() => parseReEvaluationGrades({
    attendanceGrade: '',
    midtermGrade: 8,
    finalGrade: 9
  }), /0-10/);
});
