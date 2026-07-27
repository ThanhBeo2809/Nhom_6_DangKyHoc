/**
 * Helper tính toán tiến độ học vụ (Sinh viên năm mấy, Học kỳ thứ mấy)
 * dựa trên ngày nhập học (enrollmentDate) và mã học kỳ hiện tại (semesterCode).
 * 
 * @param {string|Date} enrollmentDate - Ngày nhập học (vd: '2022-09-05')
 * @param {string} [semesterCode='HK1-2025'] - Mã học kỳ hệ thống (vd: 'HK1-2025')
 * @returns {object} academicProgress
 */
export function calculateAcademicProgress(enrollmentDate, semesterCode = 'HK1-2025') {
  if (!enrollmentDate) {
    return {
      yearOfStudy: 1,
      semesterOrdinal: 1,
      yearText: 'Năm thứ 1',
      semesterText: 'Học kỳ 1',
      enrollmentYear: null
    };
  }

  // Lấy năm nhập học
  const enrollYear = new Date(enrollmentDate).getFullYear();

  // Tách thông tin học kỳ hiện tại (vd: 'HK1-2025' -> kỳ 1, năm học 2025)
  let hkNum = 1;
  let currentYear = new Date().getFullYear();

  if (typeof semesterCode === 'string') {
    const match = semesterCode.match(/HK(\d+)-(\d{4})/i);
    if (match) {
      hkNum = parseInt(match[1], 10);
      currentYear = parseInt(match[2], 10);
    }
  }

  // Tính số năm học (ví dụ nhập học 2022, năm hiện tại 2025 -> 2025 - 2022 + 1 = Năm 4)
  let yearOfStudy = currentYear - enrollYear + 1;
  if (yearOfStudy < 1) yearOfStudy = 1;

  // Tính thứ tự học kỳ trong toàn khóa (ví dụ Năm 4, Kỳ 1 -> (4 - 1) * 2 + 1 = Học kỳ 7)
  const semesterOrdinal = (yearOfStudy - 1) * 2 + (hkNum === 1 ? 1 : 2);

  return {
    yearOfStudy,
    semesterOrdinal,
    yearText: `Năm thứ ${yearOfStudy}`,
    semesterText: `Học kỳ ${semesterOrdinal} (${semesterCode})`,
    enrollmentYear: enrollYear
  };
}
