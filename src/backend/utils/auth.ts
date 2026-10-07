import { verifyToken } from './jwt';
import { JwtUser } from '../types/auth';

// JWT handler - extracts and verifies user from request
export function getUserFromRequest(req: Request) :JwtUser | null {
  const authHeader = req.headers.get('authorization');

  if (!authHeader) return null;

  const match = /^Bearer\s+(\S+)$/i.exec(authHeader.trim());
  if (!match) return null;
  const token = match[1];

  try {
    return verifyToken(token); // { userId, email }
  } catch {
    return null;
  }
}
