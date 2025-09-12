import { UnauthorizedException, NotFoundException, Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { CreateUserDto } from '@auth/dto/create-user.dto';
import { CreateLoginDto } from '@auth/dto/create-login.dto';
import { VerifyCodeDto } from '@auth/dto/verify-code.dto';
import { ResendCodeDto } from '@auth/dto/resend-code.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtModule } from '@nestjs/jwt';
import { EmailService } from '@auth/email/email.service';
import { Prisma, size_enum, status_user, status_enum } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService, // Inyectar JwtService
  ) {}

  async createUser(dto: CreateUserDto) {
    const email = dto.email.toLowerCase().trim();

    try {
      // Busca el correo entrante en la base de datos
      /* const exists = await this.prisma.users.findUnique({
        where: { email },
      });

      // si existe dentro de la base de datos termina y no ejecuta nada mas
      if (exists) {
        throw new ConflictException('El correo ya está registrado');
      } */

      // Hashear la contraseña para la privacidad de los datos
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(dto.password_user, saltRounds);

      // Crear usuario con valores por defecto
      const user = await this.prisma.users.create({
        data: {
          name_user: dto.name_user,
          paternal_surname: dto.paternal_surname,
          maternal_surname: dto.maternal_surname,
          phone: dto.phone,
          emergency_phone: dto.emergency_phone,
          email,
          password_user: hashedPassword,
          provenance: dto.provenance,
          educational_program: dto.educational_program,
          grade: dto.grade,
          group_user: dto.group_user,
          size_user: dto.size_user as size_enum,
          kit_id: dto.kit_id ? Number(dto.kit_id) : null,
          workshop_id: dto.workshop_id ? Number(dto.workshop_id) : null,
          type_user_id: dto.type_user_id ? Number(dto.type_user_id) : null,
          status: dto.status as status_user,
        },
        select: {
          user_id: true,
          name_user: true,
          paternal_surname: true,
          maternal_surname: true,
          phone: true,
          emergency_phone: true,
          email: true,
          provenance: true,
          educational_program: true,
          grade: true,
          group_user: true,
        },
      });

      // Generar token de verificación
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Crear registro en verification_token
      await this.prisma.verification_token.create({
        data: {
          token: verificationCode,
          token_type: 'email_verification',
          user_id: user.user_id, // BigInt del usuario recién creado
          used: false,
          attempts: 0,
          // created_at y expires_at se generan automáticamente por la base de datos
          // según tu schema: created_at = now(), expires_at = now() + 10 minutes
        }
      });

      // Enviar correo de verificación
      try {
        await this.emailService.sendVerificationCode(user.email, verificationCode);
      } catch (emailError) {
        console.error('Error enviando email de verificación:', emailError);
        // No lanzar error para no interrumpir el flujo, solo loggear
      }

      // Transformar BigInt a Number para la respuesta
      const userResponse = {
        ...user,
        user_id: Number(user.user_id),
      };

      return {
        message: 'Usuario creado exitosamente. Se ha enviado un correo de verificación.',
        user: userResponse,
      };

    } catch (error: unknown) {
      console.error('Error detallado al crear usuario:', error);
      
      if (error instanceof ConflictException) {
        throw error;
      }

      // Manejo seguro del error
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      throw new InternalServerErrorException(`Error al crear el usuario: ${errorMessage}`);
    }
  }
// Iniciar sesión (login)
  async loginUser(dto: CreateLoginDto) {
    try {
      const user = await this.prisma.users.findUnique({
        where: { email: dto.email.toLowerCase().trim() },
      });

      if (!user) {
        throw new UnauthorizedException('Las credenciales son incorrectas');
      }

      // Verificar si el usuario está activo
      if (user.status !== 'active') {
        throw new UnauthorizedException('La cuenta no está verificada. Por favor verifica tu email.');
      }

      // Comparar contraseñas
      const isPasswordValid = await bcrypt.compare(dto.password, user.password_user);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Las credenciales son incorrectas');
      }

      // Crear JWT (access token)
      const payload = { 
        userId: Number(user.user_id),
        email: user.email 
      };
      
      const accessToken = this.jwtService.sign(payload, { 
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h' 
      });
      
      const refreshToken = this.jwtService.sign(
        { ...payload, isRefreshToken: true }, 
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
      );

      // Guardar refresh token en la base de datos (opcional para invalidación)
      await this.prisma.verification_token.create({
        data: {
          token: refreshToken,
          token_type: 'refresh_token',
          user_id: user.user_id,
          used: false,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
          attempts: 0,
        }
      });

      return {
        message: 'Login exitoso',
        access_token: accessToken,
        refresh_token: refreshToken,
        user_id: Number(user.user_id),
      };

    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      console.error('Error en login:', error);
      throw new InternalServerErrorException('Error al iniciar sesión');
    }
  }

  // Verificar código de verificación
  async verifyCode(dto: VerifyCodeDto) {
    try {
      const user = await this.prisma.users.findUnique({
        where: { email: dto.email.toLowerCase().trim() },
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Buscar token de verificación válido
      const verificationToken = await this.prisma.verification_token.findFirst({
        where: {
          user_id: user.user_id,
          token: dto.code,
          token_type: 'email_verification',
          used: false,
          expires_at: { gt: new Date() } // Token no expirado
        },
        orderBy: { created_at: 'desc' } // Tomar el más reciente
      });

      if (!verificationToken) {
        // Incrementar intentos fallidos si existe algún token
        await this.incrementVerificationAttempts(user.user_id);
        throw new UnauthorizedException('Código de verificación inválido o expirado');
      }

      // Verificar intentos excesivos
      if ((verificationToken.attempts || 0) >= 5) {
        throw new UnauthorizedException('Demasiados intentos fallidos. Por favor solicitaun nuevo código.');
      }

      // Actualizar usuario a activo
      await this.prisma.users.update({
        where: { user_id: user.user_id },
        data: { status: 'active' as status_user }
      });

      // Marcar token como usado
      await this.prisma.verification_token.update({
          where: { verification_token_id: verificationToken.verification_token_id },
          data: { 
              used: true, 
              used_at: new Date(),
              attempts: (verificationToken.attempts || 0) + 1  // Si es null, usa 0 + 1 = 1
          }
      });

      // Invalidar otros tokens de verificación del mismo usuario
      await this.prisma.verification_token.updateMany({
        where: {
          user_id: user.user_id,
          token_type: 'email_verification',
          used: false,
          verification_token_id: { not: verificationToken.verification_token_id }
        },
        data: { used: true }
      });

      return { 
        message: 'Usuario verificado exitosamente',
        user_id: Number(user.user_id)
      };

    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      
      console.error('Error en verificación:', error);
      throw new InternalServerErrorException('Error al verificar el código');
    }
  }

  // Método auxiliar para incrementar intentos de verificación
  private async incrementVerificationAttempts(userId: bigint) {
    try {
        const latestToken = await this.prisma.verification_token.findFirst({
            where: {
                user_id: userId,
                token_type: 'email_verification',
                used: false
            },
            orderBy: { created_at: 'desc' }
        });

        if (latestToken) {
            await this.prisma.verification_token.update({
                where: { verification_token_id: latestToken.verification_token_id },
                data: { 
                    attempts: { 
                        increment: 1 
                    } 
                }
            });
        }
    } catch (error) {
        console.error('Error incrementando intentos:', error);
    }
  }

  // Obtener perfil de usuario
  async getProfile(userId: number) {
    try {
      const user = await this.prisma.users.findUnique({
        where: { user_id: BigInt(userId) },
        include: {
          type_user: {
            select: { name_type: true, descript: true }
          }
        }
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Devolver solo los datos públicos, sin la contraseña
      const { password_user, ...profile } = user;
      
      // Transformar BigInt a Number
      return {
        ...profile,
        user_id: Number(profile.user_id),
        kit_id: profile.kit_id ? Number(profile.kit_id) : null,
        workshop_id: profile.workshop_id ? Number(profile.workshop_id) : null,
        type_user_id: profile.type_user_id ? Number(profile.type_user_id) : null,
      };

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      console.error('Error obteniendo perfil:', error);
      throw new InternalServerErrorException('Error al obtener el perfil');
    }
  }

  // Logout (invalidar refresh token)
  async logout(userId: number, refreshToken: string) {
    try {
      // Invalidar el refresh token específico
      await this.prisma.verification_token.updateMany({
        where: {
          user_id: BigInt(userId),
          token: refreshToken,
          token_type: 'refresh_token',
          used: false
        },
        data: { 
          used: true,
          used_at: new Date()
        }
      });

      return { message: 'Sesión cerrada exitosamente' };

    } catch (error) {
      console.error('Error en logout:', error);
      throw new InternalServerErrorException('Error al cerrar sesión');
    }
  }

  // Reenviar código de verificación
  async resendCode(dto: ResendCodeDto) {
    try {
      const user = await this.prisma.users.findUnique({
        where: { email: dto.email.toLowerCase().trim() },
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Invalidar tokens anteriores no usados
      await this.prisma.verification_token.updateMany({
        where: {
          user_id: user.user_id,
          token_type: 'email_verification',
          used: false
        },
        data: { used: true }
      });

      // Generar nuevo código de verificación
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Crear nuevo registro de token
      await this.prisma.verification_token.create({
        data: {
          token: verificationCode,
          token_type: 'email_verification',
          user_id: user.user_id,
          used: false,
          attempts: 0,
        }
      });

      // Enviar email
      await this.emailService.sendVerificationCode(user.email, verificationCode);

      return { message: 'Código de verificación reenviado exitosamente' };

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      console.error('Error reenviando código:', error);
      throw new InternalServerErrorException('Error al reenviar el código de verificación');
    }
  }

  // Refresh token
  async refreshToken(refreshToken: string) {
    try {
      // Verificar que el refresh token sea válido y no esté usado
      const tokenRecord = await this.prisma.verification_token.findFirst({
        where: {
          token: refreshToken,
          token_type: 'refresh_token',
          used: false,
          expires_at: { gt: new Date() }
        },
        include: { users: true }
      });

      if (!tokenRecord || !tokenRecord.users) {
        throw new UnauthorizedException('Token de refresco inválido');
      }

      // Marcar token como usado
      await this.prisma.verification_token.update({
        where: { verification_token_id: tokenRecord.verification_token_id },
        data: { used: true, used_at: new Date() }
      });

      // Generar nuevos tokens
      const payload = { 
        userId: Number(tokenRecord.users.user_id),
        email: tokenRecord.users.email 
      };
      
      const newAccessToken = this.jwtService.sign(payload, { 
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h' 
      });
      
      const newRefreshToken = this.jwtService.sign(
        { ...payload, isRefreshToken: true }, 
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
      );

      // Guardar nuevo refresh token
      await this.prisma.verification_token.create({
        data: {
          token: newRefreshToken,
          token_type: 'refresh_token',
          user_id: tokenRecord.user_id,
          used: false,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          attempts: 0,
        }
      });

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      };

    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      console.error('Error refrescando token:', error);
      throw new InternalServerErrorException('Error al refrescar el token');
    }
  }
}