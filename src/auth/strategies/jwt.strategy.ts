import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { JwtPayload } from '../interfaces/jwt-payload.interface'; // Creamos esta interfaz para el payload
import { ExtractJwt, Strategy } from 'passport-jwt';
import { envs } from '../../config/envs'; // Importamos desde el archivo de configuración

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Extrae el JWT del header "Authorization"
      secretOrKey: envs.jwtSecret, // Usamos JWT_SECRET desde el archivo de configuración
    });
  }

  // Este método valida el payload y determina si la petición tiene permiso para acceder
  async validate(payload: JwtPayload) {
    return { userId: payload.userId }; // Extraemos el `userId` del payload y lo devolvemos
  }
}
