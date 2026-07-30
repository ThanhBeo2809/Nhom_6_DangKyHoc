import { sequelize } from '../models/index.js';
import { seedAllStudentAcademicResults } from '../utils/demoAcademicResultsSeeder.js';

try {
  const summary = await seedAllStudentAcademicResults();
  console.log('Đã nhập dữ liệu kết quả học tập:', summary);
} catch (error) {
  console.error('Không thể nhập dữ liệu kết quả học tập:', error);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
