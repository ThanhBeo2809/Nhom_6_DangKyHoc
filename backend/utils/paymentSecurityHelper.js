export function isPaymentSimulationEnabled(env = process.env) {
  return env.NODE_ENV !== 'production' && env.ALLOW_PAYMENT_SIMULATION === 'true';
}

export function requirePaymentSimulationEnabled(req, res, next) {
  if (!isPaymentSimulationEnabled()) {
    return res.status(403).json({
      code: 'PAYMENT_SIMULATION_DISABLED',
      message: 'Chức năng mô phỏng thanh toán đang bị tắt.'
    });
  }

  return next();
}
