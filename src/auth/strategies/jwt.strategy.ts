// jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { PrismaService } from '@prisma/prisma.service';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { envs } from '../../config/envs';

// En tu archivo jwt.strategy.ts
// ...
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default_jwt_secret',
    });
  }

  async validate(payload: any) {
    // 💡 Aquí está el problema: el payload tiene `userId`, no `id`
    const user = await this.prisma.users.findUnique({
      where: { user_id: payload.userId }, // <-- Cambia a `payload.userId`
      select: { user_id: true, name_user: true, email: true },
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    return user;
  }
}