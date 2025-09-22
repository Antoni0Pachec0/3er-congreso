import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';

@Injectable()
export class WsJwtGuard extends AuthGuard('jwt') {
  constructor() {
    super();
  }

  // Sobrescribir el método canActivate para manejar WebSocket
  async canActivate(context: any): Promise<boolean> {
    const request = context.switchToWs().getClient();
    const token = this.extractTokenFromSocket(request as Socket);
    if (!token) {
      return false;
    }
    try {
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined');
      }
      const payload = verify(token, process.env.JWT_SECRET);
      (request as any).user = payload; // Asigna el payload al objeto del cliente
      return true;
    } catch (error) {
      return false;
    }
  }

  // Extraer el token del handshake de WebSocket (puede venir en headers o query)
  private extractTokenFromSocket(client: Socket): string | null {
    const handshake = client.handshake;
    // Intenta obtener el token del encabezado Authorization
    const authHeader = handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    // Alternativamente, del query (ej. ?token=...)
    return handshake.query.token as string || null;
  }
}