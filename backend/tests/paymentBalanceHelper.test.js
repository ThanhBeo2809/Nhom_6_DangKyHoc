import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getPaymentBalance,
  recordReceivedPayment,
  syncPaymentStatus
} from '../utils/paymentBalanceHelper.js';

test('học phí tăng vượt số đã nộp thì hóa đơn trở lại unpaid', () => {
  const payment = { finalAmount: 12000, paidAmount: 3000, status: 'paid' };
  const balance = syncPaymentStatus(payment);

  assert.equal(payment.status, 'unpaid');
  assert.equal(balance.remainingAmount, 9000);
});

test('ghi nhận đủ phần còn thiếu thì hóa đơn chuyển sang paid', () => {
  const payment = { finalAmount: 12000, paidAmount: 3000, status: 'unpaid' };
  const balance = recordReceivedPayment(payment, 9000);

  assert.equal(payment.paidAmount, 12000);
  assert.equal(payment.status, 'paid');
  assert.equal(balance.remainingAmount, 0);
});

test('hóa đơn miễn phí luôn được xem là đã hoàn thành', () => {
  const payment = { finalAmount: 0, paidAmount: 0, status: 'unpaid' };
  const balance = getPaymentBalance(payment);

  assert.equal(balance.isSettled, true);
  syncPaymentStatus(payment);
  assert.equal(payment.status, 'paid');
});

test('không làm mất tiền khi số đã nộp lớn hơn học phí sau điều chỉnh', () => {
  const balance = getPaymentBalance({
    finalAmount: 6000,
    paidAmount: 12000
  });

  assert.equal(balance.remainingAmount, 0);
  assert.equal(balance.overpaidAmount, 6000);
  assert.equal(balance.isSettled, true);
});
