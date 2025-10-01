// jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

function cookieExtractor(req: Request) {
  return req?.cookies?.['accessToken'] ?? null;   // 👈 nombre de la cookie
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,                               // 👈 primero cookie
        ExtractJwt.fromAuthHeaderAsBearerToken(),      //    luego Authorization
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default_jwt_secret',
    });
  }

  async validate(payload: { userId: number; email: string }) {
    // opcional: corroborar que el usuario exista
    const exists = await this.prisma.users.findUnique({
      where: { user_id: BigInt(payload.userId) },
      select: { user_id: true, email: true },
    });
    if (!exists) throw new Error('Usuario no encontrado');

    // 👇 Devuelve exactamente la forma que tu controller asume:
    return { userId: Number(exists.user_id), email: exists.email };
  }
}
