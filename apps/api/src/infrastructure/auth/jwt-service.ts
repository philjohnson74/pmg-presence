import jwt from 'jsonwebtoken';
import type { JwtClaims, JwtServicePort } from '../../domain/ports.js';

export class JwtService implements JwtServicePort {
  constructor(
    private readonly secret: string,
    private readonly expiresInSeconds: number,
  ) {}

  sign(payload: Omit<JwtClaims, 'iat' | 'exp'>): string {
    return jwt.sign(payload as object, this.secret, {
      algorithm: 'HS256',
      expiresIn: this.expiresInSeconds,
    });
  }

  verify(token: string): JwtClaims {
    const decoded = jwt.verify(token, this.secret, { algorithms: ['HS256'] });
    if (typeof decoded === 'string') {
      throw new Error('Invalid token payload');
    }
    return decoded as unknown as JwtClaims;
  }
}
