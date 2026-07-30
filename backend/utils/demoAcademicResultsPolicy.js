export function getDemoAcademicStatus(index) {
  const bucket = index % 20;
  return bucket <= 5 ? 'warning_1' : 'active';
}

export function selectDemoCourses(
  student,
  courses,
  index,
  blockedCurrentCourseIds = new Set()
) {
  const eligible = courses.filter(course =>
    (course.majorId === null || course.majorId === student.majorId)
    && !blockedCurrentCourseIds.has(course.id)
  );
  const commonPool = eligible.filter(course => course.majorId === null);
  const pool = commonPool.length >= 4 ? commonPool : eligible;

  if (pool.length < 4) {
    throw new Error(`Không đủ 4 môn phù hợp, chưa đăng ký cho sinh viên ${student.id}.`);
  }

  const selected = [];
  let cursor = index % pool.length;
  while (selected.length < 4) {
    const candidate = pool[cursor % pool.length];
    if (!selected.some(course => course.id === candidate.id)) selected.push(candidate);
    cursor += 1;
  }
  return selected;
}

export function meetingsOverlap(first, second) {
  return first.semester === second.semester
    && first.dayOfWeek === second.dayOfWeek
    && first.shift === second.shift
    && first.startSlot < second.startSlot + second.numSlots
    && second.startSlot < first.startSlot + first.numSlots;
}

export function chooseFreeLecturer(lecturers, existingMeetings, meeting, startIndex = 0) {
  for (let offset = 0; offset < lecturers.length; offset += 1) {
    const lecturer = lecturers[(startIndex + offset) % lecturers.length];
    const occupied = existingMeetings.get(lecturer.id) || [];
    if (!occupied.some(item => meetingsOverlap(item, meeting))) {
      occupied.push(meeting);
      existingMeetings.set(lecturer.id, occupied);
      return lecturer;
    }
  }

  throw new Error('Không còn giảng viên trống để xếp lớp kết quả mẫu.');
}
