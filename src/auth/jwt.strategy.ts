// src/auth/validation/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '@prisma/prisma.service';

// 🔥 EXTRACTOR MEJORADO - busca en cookies Y headers
function jwtExtractor(req: Request): string | null {
  // 1. Buscar en cookies
  if (req?.cookies?.['access_token']) {
    return req.cookies['access_token'];
  }
  
  // 2. Buscar en header Authorization
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // 3. Buscar en query string (último recurso)
  if (req.query && req.query.token) {
    return req.query.token as string;
  }
  
  return null;
}

type JwtPayload = {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([jwtExtractor]),
      secretOrKey: process.env.JWT_SECRET || 'default_jwt_secret',
      ignoreExpiration: false,
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload) {
    // 🔥 VERIFICACIÓN MÁS ROBUSTA
    if (!payload.userId || !payload.email) {
      throw new UnauthorizedException('Token inválido: faltan datos del usuario');
    }

    // Verificar que el usuario existe
    const user = await this.prisma.users.findUnique({
      where: { user_id: BigInt(payload.userId) },
      select: { 
        user_id: true, 
        email: true,
        status: true 
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Cuenta inactiva');
    }

    return {
      userId: Number(user.user_id),
      email: user.email,
    };
  }
}