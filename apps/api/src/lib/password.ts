import bcrypt from 'bcrypt';
import { env } from '../config/env.js';

// En los tests se usa el costo mínimo para que la suite no tarde segundos por cada registro.
const BCRYPT_COST = env.NODE_ENV === 'test' ? 4 : 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
