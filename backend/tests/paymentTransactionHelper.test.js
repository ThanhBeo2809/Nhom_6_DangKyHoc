import test from 'node:test';
import assert from 'node:assert/strict';

process.env.FORCE_SQLITE = 'true';
process.env.SQLITE_STORAGE = ':memory:';

const {
  Department,
  Major,
  Payment,
  PaymentTransaction,
  Student,
  User,
  sequelize
} = await import('../models/index.js');
const { syncPaymentStatus } = await import('../utils/paymentBalanceHelper.js');
const { applyPaymentTransaction } = await import('../utils/paymentTransactionHelper.js');

test.before(async () => {
  await sequelize.sync({ force: true });
  const user = await User.create({
    username: 'payment-student',
    password: 'test-password',
    role: 'student'
  });
  await Department.create({ id: 'PAY_DEP', name: 'Khoa kiểm thử thanh toán' });
  await Major.create({ id: 'PAY_MAJOR', name: 'Ngành kiểm thử', departmentId: 'PAY_DEP' });
  await Student.create({
    id: 'PAY_STUDENT',
    name: 'Sinh viên thanh toán',
    gender: 'Nam',
    dob: '2006-01-01',
    email: 'payment-student@example.com',
    enrollmentDate: '2024-09-01',
    majorId: 'PAY_MAJOR',
    class: 'PAY_CLASS',
    userId: user.id
  });
});

test.after(async () => {
  await sequelize.close();
});

test('không dùng lại giao dịch cũ khi hóa đơn mở lại sau đăng ký thêm môn', async () => {
  let payment = await Payment.create({
    studentId: 'PAY_STUDENT',
    semester: 'HK1-2026',
    amount: 12000,
    finalAmount: 12000,
    paidAmount: 0,
    status: 'unpaid',
    deadline: '2026-10-01'
  });

  await applyPaymentTransaction({
    paymentId: payment.id,
    transactionId: 'TX-PART-1',
    amount: 3000,
    method: 'Test',
    source: 'test'
  });
  let duplicate = await applyPaymentTransaction({
    paymentId: payment.id,
    transactionId: 'TX-PART-1',
    amount: 3000,
    method: 'Test',
    source: 'test'
  });
  assert.equal(duplicate.duplicate, true);

  await applyPaymentTransaction({
    paymentId: payment.id,
    transactionId: 'TX-PART-2',
    amount: 9000,
    method: 'Test',
    source: 'test'
  });
  payment = await Payment.findByPk(payment.id);
  assert.equal(payment.paidAmount, 12000);
  assert.equal(payment.status, 'paid');

  payment.amount = 15000;
  payment.finalAmount = 15000;
  syncPaymentStatus(payment);
  await payment.save();
  assert.equal(payment.status, 'unpaid');

  duplicate = await applyPaymentTransaction({
    paymentId: payment.id,
    transactionId: 'TX-PART-2',
    amount: 9000,
    method: 'Test',
    source: 'test'
  });
  assert.equal(duplicate.duplicate, true);
  payment = await Payment.findByPk(payment.id);
  assert.equal(payment.paidAmount, 12000);

  await applyPaymentTransaction({
    paymentId: payment.id,
    transactionId: 'TX-EXTRA-COURSE',
    amount: 3000,
    method: 'Test',
    source: 'test'
  });
  payment = await Payment.findByPk(payment.id);
  assert.equal(payment.paidAmount, 15000);
  assert.equal(payment.status, 'paid');
  assert.equal(await PaymentTransaction.count({ where: { paymentId: payment.id } }), 3);
});
