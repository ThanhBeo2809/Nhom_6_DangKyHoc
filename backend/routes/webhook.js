import express from 'express';
import { Payment, Student, User, AuditLog } from '../models/index.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { requirePaymentSimulationEnabled } from '../utils/paymentSecurityHelper.js';
import {
  getPaymentBalance,
  recordReceivedPayment
} from '../utils/paymentBalanceHelper.js';

const router = express.Router();

function verifyWebhookSecret(req, res, next) {
  const configured = process.env.SEPAY_WEBHOOK_SECRET;
  if (!configured && process.env.NODE_ENV !== 'production') return next();
  if (!configured) return res.status(503).json({ message: 'Webhook secret chưa được cấu hình.' });
  const authorization = req.headers.authorization || '';
  const supplied = req.headers['x-webhook-secret'] || authorization.replace(/^(Bearer|Apikey)\s+/i, '');
  if (supplied !== configured) return res.status(401).json({ message: 'Webhook không hợp lệ.' });
  return next();
}

router.post('/sepay', verifyWebhookSecret, async (req, res) => {
  try {
    const body = req.body;
    console.log('SePay Webhook:', JSON.stringify(body, null, 2));

    const content = (body.content || body.description || body.addInfo || '').toUpperCase();
    const transferType = (body.transferType || body.type || body.transfer_type || '').toLowerCase();
    const amount = Number(body.transferAmount || body.amount || 0);

    // Chỉ bỏ qua nếu giao dịch là rút tiền ra (out)
    if (transferType === 'out') {
      return res.json({ success: true, message: 'Bo qua giao dich rut tien (out).' });
    }

    // Regex linh hoạt: khớp với PKA-BILL-24, PKABILL24, PKA BILL 24, PKA_BILL_24, BILL24...
    const match = content.match(/PKA[-_\s]*BILL[-_\s]*(\d+)/i) || 
                  content.match(/BILL[-_\s]*(\d+)/i) ||
                  content.match(/PKABILL(\d+)/i);
    let payment = null;

    if (match) {
      const paymentId = parseInt(match[1]);
      console.log('Tim hoa don ID:', paymentId);
      payment = await Payment.findByPk(paymentId, {
        include: [{ model: Student, include: [User] }]
      });
    } else {
      // Fallback: Nếu không ghi đúng mã PKABILL, thử tìm Mã sinh viên trong nội dung (vd: 24100001)
      const studentMatch = content.match(/(2410\d{4})/);
      if (studentMatch) {
        const studentId = studentMatch[1];
        console.log('Tim hoa don unpaid theo Ma SV:', studentId);
        payment = await Payment.findOne({
          where: { studentId, status: 'unpaid' },
          include: [{ model: Student, include: [User] }],
          order: [['id', 'DESC']]
        });
      }
    }

    if (!payment) {
      console.log('Webhook: Khong tim thay hoa don phu hop. Content:', content);
      return res.json({ success: true, message: 'Khong tim thay hoa don.' });
    }
    if (payment.status === 'paid') {
      return res.json({ success: true, message: 'Da thanh toan roi.' });
    }

    const transactionId = body.referenceCode || body.transactionID || body.id || ('SEPAY-' + Date.now());
    const outstanding = getPaymentBalance(payment).remainingAmount;
    if (!Number.isFinite(amount) || amount < outstanding) {
      return res.json({
        success: true,
        message: 'So tien giao dich chua du de thanh toan hoa don.'
      });
    }

    const duplicateTransaction = await Payment.findOne({ where: { transactionId } });
    if (duplicateTransaction && duplicateTransaction.id !== payment.id) {
      return res.json({ success: true, message: 'Giao dich da duoc su dung cho hoa don khac.' });
    }

    recordReceivedPayment(payment, amount);
    payment.paymentMethod = 'Techcombank VietQR (SePay Auto)';
    payment.transactionId = transactionId;
    payment.paidAt = new Date();
    await payment.save();

    await AuditLog.create({
      userId: payment.Student?.userId || null,
      username: payment.Student?.User?.username || 'system',
      action: 'NOP_HOC_PHI_AUTO',
      details: JSON.stringify({ paymentId: payment.id, amount, transactionId, source: 'SePay Webhook' }),
      ipAddress: req.ip || 'SePay'
    });

    console.log('✅ Xac nhan thanh toan HD#' + payment.id + ': ' + payment.finalAmount + ' VND | TX: ' + transactionId);

    // Phát sự kiện Socket.IO real-time tới phòng của sinh viên
    const io = req.app.get('io');
    if (io && payment.studentId) {
      io.to('student_' + payment.studentId).emit('payment_confirmed', {
        paymentId: payment.id,
        amount,
        transactionId,
        paidAt: payment.paidAt,
        message: 'Thanh toán học phí xác nhận thành công!'
      });
      console.log('📡 Da phat Socket.IO payment_confirmed toi student_' + payment.studentId);
    }

    return res.json({ success: true, message: 'OK' });
  } catch (error) {
    console.error('Loi SePay Webhook:', error);
    return res.status(500).json({ success: false, message: 'Loi server.' });
  }
});

// Endpoint hỗ trợ Mô phỏng nạp tiền tự động (Dành cho Demo / Testing khi chưa kết nối ngân hàng thật)
router.post(
  '/test-simulate-pay',
  authenticateToken,
  authorizeRoles('student'),
  requirePaymentSimulationEnabled,
  async (req, res) => {
  try {
    const { paymentId } = req.body;
    if (!paymentId) return res.status(400).json({ message: 'Thiếu paymentId' });

    const payment = await Payment.findByPk(paymentId, {
      include: [{ model: Student, include: [User] }]
    });

    if (!payment) return res.status(404).json({ message: 'Không tìm thấy hóa đơn.' });
    if (!payment.Student || payment.Student.userId !== req.user.id) {
      return res.status(403).json({ message: 'Bạn không có quyền thanh toán hóa đơn này.' });
    }

    const transactionId = 'SIM-TCB-' + Math.floor(Math.random() * 900000000 + 100000000);
    const receivedAmount = getPaymentBalance(payment).remainingAmount;
    if (receivedAmount <= 0) {
      return res.status(400).json({ message: 'Hóa đơn đã được thanh toán đầy đủ.' });
    }
    recordReceivedPayment(payment, receivedAmount);
    payment.paymentMethod = 'Techcombank VietQR (Simulated Auto)';
    payment.transactionId = transactionId;
    payment.paidAt = new Date();
    await payment.save();

    await AuditLog.create({
      userId: payment.Student?.userId || null,
      username: payment.Student?.User?.username || 'system',
      action: 'NOP_HOC_PHI_TEST_SIMULATE',
      details: JSON.stringify({ paymentId: payment.id, amount: receivedAmount, transactionId }),
      ipAddress: req.ip || 'Localhost'
    });

    // Phát Socket.IO real-time
    const io = req.app.get('io');
    if (io && payment.studentId) {
      io.to('student_' + payment.studentId).emit('payment_confirmed', {
        paymentId: payment.id,
        amount: receivedAmount,
        transactionId,
        paidAt: payment.paidAt,
        message: 'Thanh toán học phí xác nhận thành công!'
      });
    }

    return res.json({ success: true, message: 'Mô phỏng ngân hàng chuyển tiền thành công!', transactionId });
  } catch (err) {
    console.error('Lỗi mô phỏng thanh toán:', err);
    return res.status(500).json({ message: 'Lỗi server khi mô phỏng.' });
  }
  }
);

// Helper kiểm tra giao dịch thực tế trực tiếp qua SePay API (Chủ động check 100%, không cần Tunnel)
async function checkSePayApiForPayment(payment, req) {
  if (!payment || payment.status === 'paid') return payment;

  const apiToken = process.env.SEPAY_API_TOKEN || '';
  const accountNumber = process.env.SEPAY_ACCOUNT_NUMBER || '0665993159999';

  if (!apiToken) return payment;

  try {
    const res = await fetch(`https://my.sepay.vn/userapi/transactions/list?account_number=${accountNumber}&limit=20`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) return payment;
    const data = await res.json();
    const transactions = data.transactions || data.messages || [];

    // Thời gian tạo/cập nhật hóa đơn
    const paymentCreatedTime = new Date(payment.createdAt || payment.updatedAt || Date.now() - 3600000).getTime();

    for (let tx of transactions) {
      const content = (tx.transaction_content || tx.content || tx.description || tx.code || '').toUpperCase();
      const amount = parseFloat(tx.amount_in || tx.transferAmount || tx.amount || 0);
      const isIncoming = (tx.transferType || tx.type || '').toLowerCase() === 'in' || (tx.amount_in && parseFloat(tx.amount_in) > 0) || amount > 0;

      // 1. Kiểm tra thời gian giao dịch phải SAU khi hóa đơn được tạo (cho phép sai số 2 phút)
      const txDateStr = tx.transaction_date || tx.transactionDate || tx.created_at;
      const txTime = txDateStr ? new Date(txDateStr).getTime() : 0;

      if (txTime && txTime < paymentCreatedTime - 120000) {
        // Bỏ qua giao dịch cũ diễn ra trước khi tạo hóa đơn này
        continue;
      }

      // 2. Kiểm tra số tiền nhận được phải đủ số tiền thực trả
      const outstanding = getPaymentBalance(payment).remainingAmount;
      if (amount < outstanding) {
        continue;
      }

      // 3. Khớp CHÍNH XÁC Mã hóa đơn dạng PKABILL<id> hoặc BILL<id> (dùng ranh giới từ \b để tránh khớp nhầm PKABILL33 với BILL3)
      const exactRefRegex = new RegExp(`\\b(PKABILL|BILL)[-_\\s]*${payment.id}\\b`, 'i');
      const isRefMatched = exactRefRegex.test(content);

      if (isIncoming && isRefMatched) {
        recordReceivedPayment(payment, amount);
        payment.paymentMethod = 'MBBank VietQR (SePay Direct API)';
        payment.transactionId = tx.reference_number || tx.referenceCode || tx.id || ('SEPAY-API-' + Date.now());
        payment.paidAt = txTime ? new Date(txTime) : new Date();
        await payment.save();

        await AuditLog.create({
          userId: payment.Student?.userId || null,
          username: payment.Student?.User?.username || 'system',
          action: 'NOP_HOC_PHI_SEPAY_API_AUTO',
          details: JSON.stringify({ paymentId: payment.id, amount, transactionId: payment.transactionId }),
          ipAddress: req?.ip || 'SePayAPI'
        });

        // Phát Socket.IO real-time
        const io = req?.app?.get('io');
        if (io && payment.studentId) {
          io.to('student_' + payment.studentId).emit('payment_confirmed', {
            paymentId: payment.id,
            amount,
            transactionId: payment.transactionId,
            paidAt: payment.paidAt,
            message: 'Thanh toán học phí xác nhận tự động thành công!'
          });
        }

        console.log('✅ SePay Direct API: Đã tự động gạch nợ HĐ#' + payment.id);
        break;
      }
    }
  } catch (err) {
    console.error('Lỗi khi đối soát SePay Direct API:', err.message);
  }

  return payment;
}

router.get('/payment-status/:paymentId', authenticateToken, async (req, res) => {
  try {
    let payment = await Payment.findByPk(req.params.paymentId, {
      include: [{ model: Student, include: [User] }]
    });

    if (!payment) return res.status(404).json({ message: 'Khong tim thay.' });
    if (req.user.role === 'student' && payment.Student?.userId !== req.user.id) {
      return res.status(403).json({ message: 'Bạn không có quyền xem hóa đơn này.' });
    }

    // Nếu chưa thanh toán, chủ động kiểm tra với SePay Direct API ngay lập tức
    if (payment.status === 'unpaid') {
      payment = await checkSePayApiForPayment(payment, req);
    }

    return res.json({
      ...getPaymentBalance(payment),
      status: payment.status,
      paidAt: payment.paidAt,
      transactionId: payment.transactionId
    });
  } catch (err) {
    return res.status(500).json({ message: 'Loi server.' });
  }
});

export default router;
