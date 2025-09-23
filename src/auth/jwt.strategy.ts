import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

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
    // 💡 Usa `payload.userId` para que coincida con el payload del token
    const user = await this.prisma.users.findUnique({
      where: { user_id: payload.userId }, 
      select: { user_id: true, name_user: true, email: true },
    });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    
    // 💡 Devuelve un objeto con un nombre de propiedad consistente, como `id`
    return { id: user.user_id };
  }
}