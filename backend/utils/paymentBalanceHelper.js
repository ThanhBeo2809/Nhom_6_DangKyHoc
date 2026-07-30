function toMoney(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
}

export function getPaymentBalance(payment) {
  const finalAmount = toMoney(payment?.finalAmount);
  const paidAmount = toMoney(payment?.paidAmount);
  const remainingAmount = Math.max(finalAmount - paidAmount, 0);
  const overpaidAmount = Math.max(paidAmount - finalAmount, 0);

  return {
    finalAmount,
    paidAmount,
    remainingAmount,
    overpaidAmount,
    isSettled: finalAmount === 0 || remainingAmount === 0
  };
}

export function syncPaymentStatus(payment) {
  const balance = getPaymentBalance(payment);
  payment.paidAmount = balance.paidAmount;
  payment.status = balance.isSettled ? 'paid' : 'unpaid';
  return balance;
}

export function recordReceivedPayment(payment, receivedAmount) {
  const amount = toMoney(receivedAmount);
  if (amount <= 0) {
    throw new Error('Số tiền thanh toán phải lớn hơn 0.');
  }

  payment.paidAmount = toMoney(payment.paidAmount) + amount;
  return syncPaymentStatus(payment);
}

export function paymentWithBalance(payment) {
  const plain = typeof payment?.toJSON === 'function' ? payment.toJSON() : { ...payment };
  return {
    ...plain,
    ...getPaymentBalance(plain)
  };
}
