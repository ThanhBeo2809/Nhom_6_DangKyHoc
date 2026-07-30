import { Op } from 'sequelize';
import { AcademicTerm, RegistrationPeriod } from '../models/index.js';

const FALLBACK_TERM = process.env.CURRENT_SEMESTER || 'HK1-2026';

export async function getCurrentAcademicTerm({ transaction } = {}) {
  const term = await AcademicTerm.findOne({
    where: { isCurrent: true },
    order: [['updatedAt', 'DESC']],
    transaction
  });

  if (term) return term;

  return {
    id: FALLBACK_TERM,
    name: FALLBACK_TERM,
    status: 'active',
    isCurrent: true
  };
}

export async function getCurrentSemester(options = {}) {
  const term = await getCurrentAcademicTerm(options);
  return term.id;
}

export async function getRegistrationWindow(termId, now = new Date(), { transaction } = {}) {
  const period = await RegistrationPeriod.findOne({
    where: {
      termId,
      isEnabled: true,
      startAt: { [Op.lte]: now },
      endAt: { [Op.gte]: now }
    },
    order: [['startAt', 'DESC']],
    transaction
  });

  const nextPeriod = period ? null : await RegistrationPeriod.findOne({
    where: {
      termId,
      isEnabled: true,
      startAt: { [Op.gt]: now }
    },
    order: [['startAt', 'ASC']],
    transaction
  });

  return {
    isOpen: Boolean(period),
    period,
    nextPeriod
  };
}

export async function assertRegistrationOpen(termId, options = {}) {
  const window = await getRegistrationWindow(termId, new Date(), options);
  if (!window.isOpen) {
    const detail = window.nextPeriod
      ? `Đợt tiếp theo bắt đầu lúc ${new Date(window.nextPeriod.startAt).toLocaleString('vi-VN')}.`
      : 'Phòng Đào tạo chưa cấu hình đợt đăng ký tiếp theo.';
    const error = new Error(`Cổng đăng ký học phần hiện đang đóng. ${detail}`);
    error.status = 403;
    error.code = 'REGISTRATION_CLOSED';
    throw error;
  }
  return window.period;
}
