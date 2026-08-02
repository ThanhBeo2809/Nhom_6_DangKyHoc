import {
  Class,
  Course,
  Payment,
  Registration,
  Student,
  sequelize
} from '../models/index.js';
import { getCurrentSemester } from '../utils/academicTermHelper.js';
import { backfillLegacyPaymentTransactions } from '../utils/paymentTransactionHelper.js';
import { COST_PER_CREDIT, updateTuition } from '../utils/tuitionHelper.js';

async function repairTuitionInvoices() {
  await sequelize.sync();
  const legacyTransactions = await backfillLegacyPaymentTransactions();
  const semester = await getCurrentSemester();
  const students = await Student.findAll({ order: [['id', 'ASC']] });
  const transaction = await sequelize.transaction();

  try {
    for (const student of students) {
      await updateTuition(student.id, semester, transaction);
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  const mismatches = [];
  for (const student of students) {
    const registrations = await Registration.findAll({
      where: { studentId: student.id, status: 'enrolled' },
      include: [{
        model: Class,
        where: { semester, status: 'active' },
        include: [Course]
      }]
    });
    const credits = registrations.reduce(
      (sum, registration) => sum + Number(registration.Class?.Course?.credits || 0),
      0
    );
    const payment = await Payment.findOne({ where: { studentId: student.id, semester } });
    const expectedAmount = credits * COST_PER_CREDIT;
    if (!payment || Number(payment.amount) !== expectedAmount) {
      mismatches.push({
        studentId: student.id,
        credits,
        expectedAmount,
        storedAmount: payment?.amount ?? null
      });
    }
  }

  if (mismatches.length > 0) {
    throw new Error(`Còn ${mismatches.length} hóa đơn chưa khớp: ${JSON.stringify(mismatches)}`);
  }

  return {
    semester,
    students: students.length,
    repairedInvoices: students.length,
    mismatches: 0,
    legacyTransactions
  };
}

try {
  console.log(JSON.stringify(await repairTuitionInvoices(), null, 2));
} finally {
  await sequelize.close();
}
