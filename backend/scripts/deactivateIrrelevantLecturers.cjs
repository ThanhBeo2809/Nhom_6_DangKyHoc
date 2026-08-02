require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

const keepLecturerIds = [
  'PE20220118',
  'GV20260001', 'GV20260005', 'GV20260006',
  'GV20260047', 'GV20260048', 'GV20260049', 'GV20260050', 'GV20260051',
  'GV20260052', 'GV20260053', 'GV20260054', 'GV20260055', 'GV20260056',
  'GV20260057', 'GV20260058', 'GV20260059',
  'GV20260136', 'GV20260140', 'GV20260143', 'GV20260144', 'GV20260147',
  'GV20260149', 'GV20260157',
];

async function main() {
  const applyChanges = process.argv.includes('--apply');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    const placeholders = keepLecturerIds.map(() => '?').join(', ');
    const [targets] = await connection.query(`
      SELECT l.id, l.name, u.id AS userId, u.username, u.status AS accountStatus,
             SUM(cl.semester = 'HK1-2026' AND cl.status = 'active') AS activeCurrentClasses,
             COUNT(DISTINCT g.id) AS historicalGradeRows
      FROM lecturers l
      JOIN users u ON u.id = l.userId
      LEFT JOIN classes cl ON cl.lecturerId = l.id
      LEFT JOIN grades g ON g.classId = cl.id
      WHERE l.id NOT IN (${placeholders})
      GROUP BY l.id, l.name, u.id, u.username, u.status
      ORDER BY l.id
    `, keepLecturerIds);

    const [kept] = await connection.query(`
      SELECT l.id, l.name, u.username, u.status
      FROM lecturers l JOIN users u ON u.id = l.userId
      WHERE l.id IN (${placeholders}) ORDER BY l.id
    `, keepLecturerIds);

    console.log(JSON.stringify({
      mode: applyChanges ? 'apply' : 'dry-run',
      requestedKeepCount: keepLecturerIds.length,
      existingKeepCount: kept.length,
      targetAccountCount: targets.length,
      activeCurrentClassesToClose: targets.reduce(
        (sum, row) => sum + Number(row.activeCurrentClasses || 0), 0
      ),
      ...(applyChanges ? {} : { targets }),
    }, null, 2));

    if (!applyChanges) return;

    await connection.beginTransaction();
    const targetUserIds = targets.map(row => row.userId);
    const targetLecturerIds = targets.map(row => row.id);

    let closedClasses = 0;
    if (targetLecturerIds.length) {
      const lecturerPlaceholders = targetLecturerIds.map(() => '?').join(', ');
      const [classResult] = await connection.query(`
        UPDATE classes
        SET status = 'canceled', updatedAt = NOW()
        WHERE semester = 'HK1-2026' AND status = 'active'
          AND lecturerId IN (${lecturerPlaceholders})
      `, targetLecturerIds);
      closedClasses = classResult.affectedRows;
    }

    let deactivatedAccounts = 0;
    if (targetUserIds.length) {
      const userPlaceholders = targetUserIds.map(() => '?').join(', ');
      const [userResult] = await connection.query(`
        UPDATE users
        SET status = 'locked', tokenVersion = tokenVersion + 1, updatedAt = NOW()
        WHERE id IN (${userPlaceholders}) AND status <> 'locked'
      `, targetUserIds);
      deactivatedAccounts = userResult.affectedRows;
    }

    await connection.commit();
    console.log(JSON.stringify({ applied: true, deactivatedAccounts, closedClasses }));

    const [verification] = await connection.query(`
      SELECT
        (SELECT COUNT(*) FROM lecturers l JOIN users u ON u.id = l.userId
          WHERE u.status = 'active') AS activeLecturerAccounts,
        (SELECT COUNT(*) FROM lecturers l JOIN users u ON u.id = l.userId
          WHERE u.status = 'locked') AS lockedLecturerAccounts,
        (SELECT COUNT(*) FROM classes cl JOIN lecturers l ON l.id = cl.lecturerId
          JOIN users u ON u.id = l.userId
          WHERE cl.semester = 'HK1-2026' AND cl.status = 'active'
            AND u.status <> 'active') AS activeClassesWithLockedLecturer,
        (SELECT COUNT(*) FROM registrations r JOIN classes cl ON cl.id = r.classId
          JOIN students s ON s.id = r.studentId
          WHERE cl.semester = 'HK1-2026' AND s.majorId = 'cntt'
            AND r.status IN ('enrolled', 'waitlist')
            AND cl.status <> 'active') AS currentRegistrationsInClosedClasses,
        (SELECT COUNT(*) FROM classes cl JOIN courses co ON co.id = cl.courseId
          WHERE cl.semester = 'HK1-2026' AND cl.status = 'active'
            AND co.term = 5 AND co.majorId = 'cntt') AS activeTerm5Classes,
        (SELECT COUNT(*) FROM grades g JOIN classes cl ON cl.id = g.classId
          JOIN courses co ON co.id = g.courseId JOIN students s ON s.id = g.studentId
          WHERE cl.semester = 'HK2-2025' AND co.term = 4
            AND co.majorId = 'cntt' AND s.majorId = 'cntt' AND g.isLocked = 1)
          AS lockedTerm4GradeRows
    `);
    console.log('VERIFICATION', JSON.stringify(verification[0]));
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
