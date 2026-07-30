import test from 'node:test';
import assert from 'node:assert/strict';

import { isPaymentSimulationEnabled } from '../utils/paymentSecurityHelper.js';

test('mặc định không cho phép mô phỏng thanh toán', () => {
  assert.equal(isPaymentSimulationEnabled({}), false);
  assert.equal(isPaymentSimulationEnabled({ NODE_ENV: 'development' }), false);
});

test('chỉ cho phép mô phỏng khi được bật rõ ràng ngoài production', () => {
  assert.equal(
    isPaymentSimulationEnabled({
      NODE_ENV: 'development',
      ALLOW_PAYMENT_SIMULATION: 'true'
    }),
    true
  );
});

test('không bao giờ cho phép mô phỏng trong production', () => {
  assert.equal(
    isPaymentSimulationEnabled({
      NODE_ENV: 'production',
      ALLOW_PAYMENT_SIMULATION: 'true'
    }),
    false
  );
});
