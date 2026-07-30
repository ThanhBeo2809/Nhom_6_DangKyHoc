import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAcademicProgress } from '../utils/studentAcademicHelper.js';

test('tính đúng học kỳ thứ 7 cho sinh viên nhập học năm 2022 ở HK1-2025', () => {
  const result = calculateAcademicProgress('2022-09-05', 'HK1-2025');
  assert.equal(result.yearOfStudy, 4);
  assert.equal(result.semesterOrdinal, 7);
});

test('không trả về năm học nhỏ hơn 1', () => {
  const result = calculateAcademicProgress('2030-09-05', 'HK1-2026');
  assert.equal(result.yearOfStudy, 1);
  assert.equal(result.semesterOrdinal, 1);
});
