import test from 'node:test';
import assert from 'node:assert/strict';

process.env.FORCE_SQLITE = 'true';
process.env.SQLITE_STORAGE = ':memory:';

const {
  groupCoursesWithoutScheduleConflicts
} = await import('../utils/lecturerWorkloadHelper.js');

function course(id, dayOfWeek, startSlot) {
  return {
    id,
    courseId: id,
    meetings: [{ dayOfWeek, startSlot, numSlots: 3 }]
  };
}

test('chia mỗi giảng viên 2-3 học phần và tránh trùng lịch', () => {
  const groups = groupCoursesWithoutScheduleConflicts([
    course('COURSE_A', 2, 1),
    course('COURSE_B', 2, 4),
    course('COURSE_C', 3, 1),
    course('COURSE_D', 4, 1),
    course('COURSE_E', 4, 4)
  ]);

  assert.deepEqual(groups.map(group => group.length), [3, 2]);

  for (const group of groups) {
    assert.ok(group.length >= 2 && group.length <= 3);
    for (let first = 0; first < group.length; first++) {
      for (let second = first + 1; second < group.length; second++) {
        const firstMeeting = group[first].meetings[0];
        const secondMeeting = group[second].meetings[0];
        const overlaps = firstMeeting.dayOfWeek === secondMeeting.dayOfWeek &&
          firstMeeting.startSlot < secondMeeting.startSlot + secondMeeting.numSlots &&
          secondMeeting.startSlot < firstMeeting.startSlot + firstMeeting.numSlots;
        assert.equal(overlaps, false);
      }
    }
  }
});

test('các nhóm lớp của cùng một học phần được giao cho giảng viên khác nhau', () => {
  const groups = groupCoursesWithoutScheduleConflicts([
    { ...course('A_B01', 2, 1), courseId: 'COURSE_A' },
    { ...course('A_B02', 3, 1), courseId: 'COURSE_A' },
    { ...course('B_B01', 2, 4), courseId: 'COURSE_B' },
    { ...course('B_B02', 3, 4), courseId: 'COURSE_B' },
    { ...course('C_B01', 2, 7), courseId: 'COURSE_C' },
    { ...course('C_B02', 3, 7), courseId: 'COURSE_C' }
  ]);

  assert.deepEqual(groups.map(group => group.length), [3, 3]);
  for (const group of groups) {
    assert.equal(new Set(group.map(item => item.courseId)).size, group.length);
  }
});
