import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canTransitionStudentStatus,
  getRegistrationPolicy,
  getSuggestedWarningStatus,
  isValidStudentStatus
} from '../utils/academicStandingHelper.js';

test('áp dụng đúng giới hạn đăng ký theo trạng thái học vụ', () => {
  assert.deepEqual(getRegistrationPolicy('active'), {
    canRegister: true,
    maxCredits: 24
  });
  assert.deepEqual(getRegistrationPolicy('warning_1'), {
    canRegister: true,
    maxCredits: 12
  });
  assert.deepEqual(getRegistrationPolicy('warning_2'), {
    canRegister: true,
    maxCredits: 12
  });
  assert.deepEqual(getRegistrationPolicy('dismissed'), {
    canRegister: false,
    maxCredits: 0
  });
});

test('đề xuất mức 1 cho lần đầu và mức 2 khi cảnh báo tiếp diễn', () => {
  assert.equal(getSuggestedWarningStatus('active'), 'warning_1');
  assert.equal(getSuggestedWarningStatus('warning_1'), 'warning_2');
  assert.equal(getSuggestedWarningStatus('warning_2'), 'warning_2');
  assert.equal(getSuggestedWarningStatus('dismissed'), 'dismissed');
  assert.equal(getSuggestedWarningStatus('warning_1', false), 'active');
  assert.equal(getSuggestedWarningStatus('warning_2', false), 'active');
});

test('không cho bỏ qua trình tự cảnh báo học vụ', () => {
  assert.equal(canTransitionStudentStatus('active', 'warning_1'), true);
  assert.equal(canTransitionStudentStatus('active', 'warning_2'), false);
  assert.equal(canTransitionStudentStatus('warning_1', 'warning_2'), true);
  assert.equal(canTransitionStudentStatus('warning_1', 'dismissed'), false);
  assert.equal(canTransitionStudentStatus('warning_2', 'dismissed'), true);
  assert.equal(canTransitionStudentStatus('dismissed', 'warning_1'), false);
  assert.equal(canTransitionStudentStatus('dismissed', 'active'), true);
});

test('chỉ chấp nhận các trạng thái học vụ đã khai báo', () => {
  assert.equal(isValidStudentStatus('warning_1'), true);
  assert.equal(isValidStudentStatus('unknown'), false);
  assert.equal(isValidStudentStatus(undefined), false);
});
