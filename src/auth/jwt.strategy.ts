import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Extrae el token del header Authorization
      ignoreExpiration: false, // Revisa la expiración del token
      secretOrKey: process.env.JWT_SECRET || 'default_jwt_secret', // Clave secreta desde .env, valor por defecto
    });
  }

  async validate(payload: any) {
    // Payload contiene los datos decodificados del token (ej. id, email)
    const user = await this.prisma.users.findUnique({
      where: { user_id: payload.id },
      select: { user_id: true, name_user: true, email: true }, // Solo id y name (ajusta 'name' si usas 'nombre')
    });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    return user; // Esto se asigna a req.user
  }
}