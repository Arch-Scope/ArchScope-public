import jwt from 'jsonwebtoken';
import { JwtUser } from '../types/auth';

const MIN_JWT_SECRET_BYTES = 32;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || Buffer.byteLength(secret, 'utf8') < MIN_JWT_SECRET_BYTES) {
    throw new Error('JWT_SECRET must be configured with at least 32 bytes');
  }

  return secret;
}

export function generateToken(payload: JwtUser) {
  return jwt.sign(payload, getJwtSecret(), {
    algorithm: 'HS256',
    expiresIn: '7d',
  });
}

export function verifyToken(token: string): JwtUser | null {
  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
    });

    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof payload.userId !== 'string' ||
      typeof payload.email !== 'string'
    ) {
      return null;
    }

    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}
