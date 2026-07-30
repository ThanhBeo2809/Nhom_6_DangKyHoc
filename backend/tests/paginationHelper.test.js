import test from 'node:test';
import assert from 'node:assert/strict';
import { getPagination, paginatedResponse } from '../utils/paginationHelper.js';

test('chuẩn hóa page, limit và offset', () => {
  assert.deepEqual(getPagination({ page: '3', limit: '25' }), {
    page: 3,
    limit: 25,
    offset: 50
  });
});

test('giới hạn kích thước trang để tránh truy vấn quá lớn', () => {
  const result = getPagination({ page: '-2', limit: '9999' });
  assert.equal(result.page, 1);
  assert.equal(result.limit, 100);
  assert.equal(result.offset, 0);
});

test('trả metadata phân trang đầy đủ', () => {
  const result = paginatedResponse([{ id: 1 }], 41, 2, 20);
  assert.equal(result.pagination.totalPages, 3);
  assert.equal(result.pagination.hasPreviousPage, true);
  assert.equal(result.pagination.hasNextPage, true);
});
