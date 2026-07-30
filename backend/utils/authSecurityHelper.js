import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RefreshToken } from '../models/index.js';

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TOKEN_DAYS = Math.max(parseInt(process.env.REFRESH_TOKEN_DAYS || '7', 10), 1);

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET bắt buộc phải được cấu hình trong môi trường production.');
  }
  return secret || 'pka_portal_development_only_secret';
}

export function hashOpaqueToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, storedPassword) {
  if (!storedPassword) return { valid: false, needsUpgrade: false };
  const isHash = /^\$2[aby]\$\d{2}\$/.test(storedPassword);
  if (isHash) {
    return { valid: await bcrypt.compare(password, storedPassword), needsUpgrade: false };
  }
  const supplied = Buffer.from(String(password));
  const stored = Buffer.from(String(storedPassword));
  const valid = supplied.length === stored.length && crypto.timingSafeEqual(supplied, stored);
  return {
    valid,
    needsUpgrade: valid
  };
}

function createAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      tokenVersion: user.tokenVersion || 0
    },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

export async function issueTokenPair(user, ipAddress = null) {
  const refreshToken = crypto.randomBytes(48).toString('base64url');
  const tokenHash = hashOpaqueToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    userId: user.id,
    tokenHash,
    expiresAt,
    createdByIp: ipAddress
  });

  return {
    accessToken: createAccessToken(user),
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL,
    refreshExpiresAt: expiresAt
  };
}

export async function rotateRefreshToken(rawToken, user, ipAddress = null) {
  const oldHash = hashOpaqueToken(rawToken);
  const stored = await RefreshToken.findOne({ where: { tokenHash: oldHash } });
  if (!stored || stored.revokedAt || new Date(stored.expiresAt) <= new Date() || stored.userId !== user.id) {
    return null;
  }

  const pair = await issueTokenPair(user, ipAddress);
  stored.revokedAt = new Date();
  stored.revokedByIp = ipAddress;
  stored.replacedByTokenHash = hashOpaqueToken(pair.refreshToken);
  await stored.save();
  return pair;
}

export async function revokeAllRefreshTokens(userId, ipAddress = null) {
  await RefreshToken.update(
    { revokedAt: new Date(), revokedByIp: ipAddress },
    { where: { userId, revokedAt: null } }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret());
}
