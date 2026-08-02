require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

const lecturerId = 'GV20260149';

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    await connection.beginTransaction();

    await connection.query(`
      INSERT INTO departments (id, name)
      VALUES ('LLCT', 'Bộ môn Lý luận chính trị')
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);

    await connection.query(`
      UPDATE lecturers
      SET departmentId = 'LLCT', mainSubject = 'Tư tưởng Hồ Chí Minh',
          updatedAt = NOW()
      WHERE id = ?
    `, [lecturerId]);

    await connection.query(`
      UPDATE users u
      JOIN lecturers l ON l.userId = u.id
      SET u.status = 'active', u.tokenVersion = u.tokenVersion + 1,
          u.updatedAt = NOW()
      WHERE l.id = ?
    `, [lecturerId]);

    const [classResult] = await connection.query(`
      UPDATE classes
      SET lecturerId = ?, updatedAt = NOW()
      WHERE courseId = 'HCM101'
    `, [lecturerId]);

    await connection.commit();

    const [verification] = await connection.query(`
      SELECT g.studentId, g.courseId, g.classId, cl.semester,
             l.id AS lecturerId, l.name AS lecturerName,
             d.id AS departmentId, d.name AS departmentName,
             l.mainSubject, u.username, u.status AS accountStatus,
             g.total10, g.letterGrade, g.isLocked, g.reEvalStatus
      FROM grades g
      JOIN classes cl ON cl.id = g.classId
      JOIN lecturers l ON l.id = cl.lecturerId
      JOIN departments d ON d.id = l.departmentId
      JOIN users u ON u.id = l.userId
      WHERE g.studentId = '24100001' AND g.courseId = 'HCM101'
    `);

    const [registrationCheck] = await connection.query(`
      SELECT COUNT(*) AS registrations,
             SUM(cl.status = 'active') AS registrationsInActiveClasses,
             COUNT(DISTINCT cl.lecturerId) AS assignedLecturers
      FROM registrations r
      JOIN classes cl ON cl.id = r.classId
      WHERE cl.courseId = 'HCM101' AND cl.semester = 'HK1-2026'
    `);

    console.log(JSON.stringify({
      applied: true,
      reassignedHcm101Classes: classResult.affectedRows,
      studentGrade: verification[0] || null,
      currentRegistrationCheck: registrationCheck[0],
    }, null, 2));
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
