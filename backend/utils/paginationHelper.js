export function getPagination(query = {}, defaults = {}) {
  const defaultLimit = defaults.defaultLimit || 20;
  const maxLimit = defaults.maxLimit || 100;
  const page = Math.max(parseInt(query.page || '1', 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit || String(defaultLimit), 10) || defaultLimit, 1), maxLimit);
  return {
    page,
    limit,
    offset: (page - 1) * limit
  };
}

export function paginatedResponse(rows, count, page, limit) {
  const totalPages = Math.max(Math.ceil(count / limit), 1);
  return {
    items: rows,
    pagination: {
      page,
      limit,
      totalItems: count,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages
    }
  };
}
