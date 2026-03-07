import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'easybox_super_secret_v2_key';

export function createToken(payload: object, expiresIn: string = '24h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}
