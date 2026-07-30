import { Registration, Class, Course, Payment } from '../models/index.js';
import { syncPaymentStatus } from './paymentBalanceHelper.js';

export const COST_PER_CREDIT = 1000;

/**
 * Cập nhật học phí tự động cho sinh viên trong 1 học kỳ
 * @param {string} studentId 
 * @param {string} semester 
 * @param {object} [transaction] 
 */
export async function updateTuition(studentId, semester, transaction) {
  // Lấy tất cả lớp sinh viên ĐÃ ĐĂNG KÝ THÀNH CÔNG (enrolled)
  const regs = await Registration.findAll({
    where: { studentId, status: 'enrolled' },
    include: [{ model: Class, where: { semester, status: 'active' }, include: [Course] }],
    transaction
  });

  // Tính tổng tín chỉ
  let totalCredits = 0;
  regs.forEach(r => {
    if (r.Class && r.Class.Course) {
      totalCredits += r.Class.Course.credits;
    }
  });

  const amount = totalCredits * COST_PER_CREDIT;

  // Tìm hóa đơn học phí hiện tại để lấy discountRate
  let payment = await Payment.findOne({
    where: { studentId, semester },
    transaction
  });

  const discountRate = payment ? payment.discountRate : 0.0;
  const finalAmount = Math.round(amount * (1 - discountRate));

  if (payment) {
    payment.amount = amount;
    payment.finalAmount = finalAmount;
    syncPaymentStatus(payment);
    await payment.save({ transaction });
  } else {
    // Tạo hóa đơn mới
    const deadline = new Date();
    deadline.setMonth(deadline.getMonth() + 2); // Hạn mặc định là 2 tháng sau
    await Payment.create({
      studentId,
      semester,
      amount,
      discountRate,
      finalAmount,
      paidAmount: 0,
      status: finalAmount === 0 ? 'paid' : 'unpaid',
      deadline: deadline.toISOString().split('T')[0]
    }, { transaction });
  }
}
