import {
  Payment,
  PaymentTransaction,
  sequelize
} from '../models/index.js';
import {
  getPaymentBalance,
  recordReceivedPayment
} from './paymentBalanceHelper.js';

function normalizeTransactionId(value) {
  return String(value || '').trim();
}

function normalizePayload(payload) {
  if (payload === undefined || payload === null) return null;
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return serialized.slice(0, 10000);
}

export async function applyPaymentTransaction({
  paymentId,
  transactionId,
  amount,
  method,
  source,
  receivedAt = new Date(),
  rawPayload = null
}) {
  const normalizedId = normalizeTransactionId(transactionId);
  const receivedAmount = Math.round(Number(amount));
  if (!normalizedId) throw new Error('Thiếu mã giao dịch thanh toán.');
  if (!Number.isFinite(receivedAmount) || receivedAmount <= 0) {
    throw new Error('Số tiền thanh toán phải lớn hơn 0.');
  }

  return sequelize.transaction(async transaction => {
    const existing = await PaymentTransaction.findOne({
      where: { transactionId: normalizedId },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (existing) {
      const payment = await Payment.findByPk(existing.paymentId, { transaction });
      return {
        accepted: false,
        duplicate: true,
        alreadySettled: false,
        payment,
        paymentTransaction: existing,
        balance: getPaymentBalance(payment)
      };
    }

    const payment = await Payment.findByPk(paymentId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!payment) throw new Error('Không tìm thấy hóa đơn học phí.');

    const beforeBalance = getPaymentBalance(payment);
    if (beforeBalance.isSettled) {
      return {
        accepted: false,
        duplicate: false,
        alreadySettled: true,
        payment,
        paymentTransaction: null,
        balance: beforeBalance
      };
    }

    const paymentTransaction = await PaymentTransaction.create({
      paymentId: payment.id,
      transactionId: normalizedId,
      amount: receivedAmount,
      method: method || 'Không xác định',
      source: source || 'unknown',
      receivedAt: new Date(receivedAt),
      rawPayload: normalizePayload(rawPayload)
    }, { transaction });

    const balance = recordReceivedPayment(payment, receivedAmount);
    payment.paymentMethod = method || payment.paymentMethod;
    payment.transactionId = normalizedId;
    payment.paidAt = new Date(receivedAt);
    await payment.save({ transaction });

    return {
      accepted: true,
      duplicate: false,
      alreadySettled: false,
      payment,
      paymentTransaction,
      balance
    };
  });
}

export async function backfillLegacyPaymentTransactions() {
  const payments = await Payment.findAll({
    where: {
      transactionId: { [sequelize.Sequelize.Op.ne]: null },
      paidAmount: { [sequelize.Sequelize.Op.gt]: 0 }
    }
  });
  let created = 0;

  for (const payment of payments) {
    const transactionId = normalizeTransactionId(payment.transactionId);
    if (!transactionId) continue;
    const [, wasCreated] = await PaymentTransaction.findOrCreate({
      where: { transactionId },
      defaults: {
        paymentId: payment.id,
        transactionId,
        amount: payment.paidAmount,
        method: payment.paymentMethod || 'Giao dịch cũ',
        source: 'legacy_backfill',
        receivedAt: payment.paidAt || payment.updatedAt || payment.createdAt,
        rawPayload: null
      }
    });
    if (wasCreated) created += 1;
  }

  return { inspected: payments.length, created };
}
