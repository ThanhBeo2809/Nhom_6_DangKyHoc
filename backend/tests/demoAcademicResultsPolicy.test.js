import test from 'node:test';
import assert from 'node:assert/strict';

import {
  chooseFreeLecturer,
  getDemoAcademicStatus,
  selectDemoCourses
} from '../utils/demoAcademicResultsPolicy.js';

test('dữ liệu demo không tự gán cảnh báo mức 2 khi chưa có lịch sử', () => {
  assert.equal(getDemoAcademicStatus(0), 'warning_1');
  assert.equal(getDemoAcademicStatus(1), 'warning_1');
  assert.equal(getDemoAcademicStatus(6), 'active');
});

test('không chọn lại môn sinh viên đã đăng ký trong học kỳ hiện tại', () => {
  const courses = [
    { id: 'A', majorId: null },
    { id: 'B', majorId: null },
    { id: 'C', majorId: null },
    { id: 'D', majorId: null },
    { id: 'E', majorId: null }
  ];
  const selected = selectDemoCourses(
    { id: 'SV01', majorId: 'cntt' },
    courses,
    0,
    new Set(['A'])
  );

  assert.equal(selected.length, 4);
  assert.equal(selected.some(course => course.id === 'A'), false);
});

test('xếp giảng viên khác khi lịch của người đầu tiên bị trùng', () => {
  const lecturers = [{ id: 'GV01' }, { id: 'GV02' }];
  const meeting = {
    semester: 'HK1-2026',
    dayOfWeek: 2,
    shift: 'morning',
    startSlot: 1,
    numSlots: 3
  };
  const existing = new Map([['GV01', [{ ...meeting }]]]);

  assert.equal(chooseFreeLecturer(lecturers, existing, meeting).id, 'GV02');
});
