export function normalizeReEvaluationReason(reason) {
  const normalized = typeof reason === 'string' ? reason.trim() : '';
  if (!normalized) {
    const error = new Error('Lý do phúc khảo là bắt buộc.');
    error.status = 400;
    error.code = 'RE_EVALUATION_REASON_REQUIRED';
    throw error;
  }
  if (normalized.length > 255) {
    const error = new Error('Lý do phúc khảo không được vượt quá 255 ký tự.');
    error.status = 400;
    error.code = 'RE_EVALUATION_REASON_TOO_LONG';
    throw error;
  }
  return normalized;
}

export function getEligibleReEvaluationTerm(currentSemesterOrdinal) {
  const ordinal = Number(currentSemesterOrdinal);
  if (!Number.isInteger(ordinal) || ordinal <= 1) return null;
  return ordinal - 1;
}

export function isCourseEligibleForReEvaluation(courseTerm, currentSemesterOrdinal) {
  const eligibleTerm = getEligibleReEvaluationTerm(currentSemesterOrdinal);
  return eligibleTerm !== null && Number(courseTerm) === eligibleTerm;
}

export function parseReEvaluationGrades({
  attendanceGrade,
  midtermGrade,
  finalGrade
}) {
  const parseGrade = value => {
    if (value === null || value === undefined || String(value).trim() === '') return NaN;
    return Number(value);
  };

  const values = {
    attendanceGrade: parseGrade(attendanceGrade),
    midtermGrade: parseGrade(midtermGrade),
    finalGrade: parseGrade(finalGrade)
  };

  const valid = Object.values(values)
    .every(value => Number.isFinite(value) && value >= 0 && value <= 10);
  if (!valid) {
    const error = new Error('Ba đầu điểm phúc khảo phải là số trong khoảng 0-10.');
    error.status = 400;
    error.code = 'INVALID_RE_EVALUATION_GRADES';
    throw error;
  }

  return values;
}
