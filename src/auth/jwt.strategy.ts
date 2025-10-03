// src/auth/validation/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '@prisma/prisma.service'; // 👈 usa el mismo alias que en el resto del proyecto

// Extrae el accessToken desde la cookie (si existe)
function cookieExtractor(req: Request): string | null {
  return req?.cookies?.['access_token'] ?? null
}

type JwtPayload = {
  userId: number;
  email: string;
  // puedes agregar otros claims si los firmas (p.ej. roles, type_user_id, etc.)
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      // 1) primero cookie; 2) header Authorization: Bearer
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: process.env.JWT_SECRET || 'default_jwt_secret', // debe coincidir con el usado al firmar
      ignoreExpiration: false,
      // algorithms: ['HS256'], // opcional (por defecto HS256 si usas jwtService.sign)
      // passReqToCallback: false,
    });
  }

  // Lo que devolverás en req.user
  async validate(payload: JwtPayload) {
    // (Opcional pero recomendado) comprobar que el usuario existe aún
    const exists = await this.prisma.users.findUnique({
      where: { user_id: BigInt(payload.userId) },
      select: { user_id: true, email: true },
    });

    if (!exists) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Devuelve exactamente lo que consumen tus controllers/guards
    return {
      userId: Number(exists.user_id),
      email: exists.email,
    };
  }
}
