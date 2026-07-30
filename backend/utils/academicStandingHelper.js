export const STUDENT_STATUSES = Object.freeze([
  'active',
  'warning_1',
  'warning_2',
  'dismissed'
]);

const REGISTRATION_POLICIES = Object.freeze({
  active: Object.freeze({ canRegister: true, maxCredits: 24 }),
  warning_1: Object.freeze({ canRegister: true, maxCredits: 12 }),
  warning_2: Object.freeze({ canRegister: true, maxCredits: 12 }),
  dismissed: Object.freeze({ canRegister: false, maxCredits: 0 })
});

const ALLOWED_STATUS_TRANSITIONS = Object.freeze({
  active: new Set(['active', 'warning_1']),
  warning_1: new Set(['active', 'warning_1', 'warning_2']),
  warning_2: new Set(['active', 'warning_1', 'warning_2', 'dismissed']),
  dismissed: new Set(['active', 'dismissed'])
});

export function getRegistrationPolicy(status) {
  return REGISTRATION_POLICIES[status] || REGISTRATION_POLICIES.active;
}

export function isValidStudentStatus(status) {
  return STUDENT_STATUSES.includes(status);
}

export function canTransitionStudentStatus(fromStatus, toStatus) {
  return Boolean(ALLOWED_STATUS_TRANSITIONS[fromStatus]?.has(toStatus));
}

// Sinh viên đang bình thường được đề xuất cảnh báo lần đầu (mức 1).
// Nếu vẫn tiếp tục thuộc diện cảnh báo ở lần xét sau, mức đề xuất là mức 2.
export function getSuggestedWarningStatus(currentStatus, isAtRisk = true) {
  if (!isAtRisk) return currentStatus === 'dismissed' ? 'dismissed' : 'active';
  if (currentStatus === 'active') return 'warning_1';
  if (currentStatus === 'warning_1' || currentStatus === 'warning_2') return 'warning_2';
  return currentStatus;
}
