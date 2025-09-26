import {
  UnauthorizedException,
  NotFoundException,
  Injectable,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  Inject,
  ServiceUnavailableException,
  HttpException,
} from '@nestjs/common';
import { 
  VERIFICATION_TTL_MS, 
  RESEND_COOLDOWN_MS, 
  MAX_ATTEMPTS 
} from '@/common/tokens.constants'
import { PrismaService } from '@prisma/prisma.service';
import { CreateUserDto } from '@auth/dto/create-user.dto';
import { CreateLoginDto } from '@auth/dto/create-login.dto';
import { VerifyCodeDto } from '@auth/dto/verify-code.dto';
import { ResendCodeDto } from '@auth/dto/resend-code.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '@/auth/validation/email/email.service';
import { Prisma, size_enum, status_user, PrismaClient } from '@prisma/client';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Response } from 'express';
import { nanoid } from 'nanoid';

type DB = Prisma.TransactionClient | PrismaClient;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: any,
  ) {}

  /** Token único para QR de talleres */
  private generateUniqueToken(): string {
    return nanoid(10);
  }

  /** Enlaza redes sociales ya existentes; evita duplicados por usuario/red */
  private async createOrLinkSocials(
    db: DB,
    userId: bigint,
    dto: CreateUserDto,
  ) {
    const wanted = [
      { name: 'Facebook', url: dto.facebook_link },
      { name: 'Instagram', url: dto.instagram_link },
      { name: 'X', url: dto.x_link },
      { name: 'Linkedin', url: dto.linkedin_link },
    ].filter(x => !!x.url);

    await Promise.all(
      wanted.map(async ({ name, url }) => {
        const red = await db.red_social.findFirst({
          where: { nombre: { equals: name, mode: 'insensitive' } },
          select: { red_social_id: true },
        });
        if (!red) return;

        const existing = await db.url_red_social.findFirst({
          where: { user_id: userId, red_social_id: red.red_social_id },
          select: { url_red_social_id: true },
        });

        if (existing) {
          await db.url_red_social.update({
            where: { url_red_social_id: existing.url_red_social_id },
            data: { url: url! },
          });
        } else {
          await db.url_red_social.create({
            data: {
              url: url!,
              red_social: { connect: { red_social_id: red.red_social_id } },
              users: { connect: { user_id: userId } },
            },
          });
        }
      }),
    );
  }

  /** Crea bundle de ponente/tallerista */
  private async createSpeakerBundle(
    db: DB,
    userId: bigint,
    dto: CreateUserDto,
  ): Promise<{ workshopId?: bigint; qrToken?: string; scheduleId?: bigint }> {
    const isTaller =
      dto.tipo_presentacion === 'taller' || dto.tipo_presentacion === 'ambas';
    const isConference =
      dto.tipo_presentacion === 'conferencia' ||
      dto.tipo_presentacion === 'ambas';

    // Perfil de ponente
    await db.speaker_profiles.create({
      data: {
        name_company: dto.empresa_procedencia ?? null,
        rol_company: dto.rol_dentro_empresa ?? null,
        rol_event: dto.tipo_presentacion ?? null,
        personal_description: dto.descripcion_biografia ?? null,
        user_id: userId,
      },
    });

    let workshopId: bigint | undefined;
    let qrToken: string | undefined;

    if (isTaller) {
      const workshop = await db.workshop.create({
        data: {
          name_workshop: dto.titulo_taller || null,
          descript: dto.descripcion_taller || null,
          status: 'active',
          users_workshop_instructor_user_idTousers: {
            connect: { user_id: userId },
          },
        },
      });
      workshopId = workshop.workshop_id;

      qrToken = this.generateUniqueToken();
      await db.qr_code.create({
        data: {
          token: qrToken,
          workshop: { connect: { workshop_id: workshop.workshop_id } },
        },
      });
    }

    let scheduleId: bigint | undefined;
    if (isConference) {
      const schedule = await db.schedule.create({
        data: {
          name_conference: dto.titulo_conferencia || null,
          descript: dto.descripcion_conferencia || null,
          users: { connect: { user_id: userId } },
        },
      });
      scheduleId = schedule.schedule_id;
    }

    await this.createOrLinkSocials(db, userId, dto);

    return { workshopId, qrToken, scheduleId };
  }

  // ==============================
  //       REGISTRO USUARIO
  // ==============================
  // Dentro de AuthService

async createUser(dto: CreateUserDto) {
  const email = dto.email.toLowerCase().trim();
  const typeUserId = Number(dto.type_user_id);
  const isSpeaker = typeUserId === 4;

  // (Opcional recomendado) validar clave secreta de ponente
  if (isSpeaker) {
    const secret = (process.env.SPEAKER_SECRET || '').trim();
    if (!secret || (dto.secret_password || '').trim() !== secret) {
      throw new UnauthorizedException('Contraseña de ponente inválida');
    }
  }

  const hashedPassword = await bcrypt.hash(dto.password_user, 12);
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Armar data del usuario (sin transacción)
  const userData: Prisma.usersCreateInput = {
    name_user: dto.name_user,
    paternal_surname: dto.paternal_surname,
    maternal_surname: dto.maternal_surname,
    phone: dto.phone,
    ...(dto.emergency_phone ? { emergency_phone: dto.emergency_phone } : {}),
    email,
    password_user: hashedPassword,
    size_user: dto.size_user as size_enum,
    type_user: { connect: { type_user_id: typeUserId } },
    status: 'inactive',
    // crear el token de verificación anidado para evitar 2 llamadas y transacción
    verification_token: {
      create: {
        token: verificationCode,
        token_type: 'email_verification',
        used: false,
        attempts: 0,
      },
    },
  };

  // Procedencia / datos académicos
  if (dto.provenance === 'uttecam') {
    userData.provenance = dto.provenance;
    userData.matricula = dto.matricula;
    userData.educational_program = dto.educational_program;
    if (typeUserId === 1) {
      userData.grade = dto.grade;
      userData.group_user = dto.group_user;
    }
  } else if (dto.provenance === 'otra') {
    userData.provenance = dto.universidad_procedencia;
  }

  try {
    // ===== 1) Crear usuario + token en UNA sola operación =====
    const user = await this.prisma.users.create({
      data: userData,
      select: { user_id: true, name_user: true, email: true, status: true },
    });

    // ===== 2) Disparar tareas pesadas en background (sin await) =====
    if (isSpeaker) {
      // crear perfil, workshop/QR y/o conferencia sin bloquear la respuesta
      this.createSpeakerBundle(this.prisma, user.user_id, dto).catch((e) =>
        console.error('[Speaker bundle error]', e),
      );
    }

    this.emailService
      .sendVerificationCode(user.email, verificationCode)

      // ===== 3) Responder rápido al front =====
    return {
      message: 'Usuario creado exitosamente. Te enviamos un correo de verificación.',
      email_sent: true, // "enviado" en background; si falla queda logueado
      user: {
        user_id: Number(user.user_id),
        name_user: user.name_user,
        email: user.email,
      },
    };
  } catch (error) {
    // Prisma: unique constraint (correo duplicado)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // Ver si el usuario existe y está INACTIVO → reenviar código y regresar 200
      const existing = await this.prisma.users.findUnique({
        where: { email },
        select: { user_id: true, status: true, email: true },
      });

      if (existing && existing.status === 'inactive') {
        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        await this.prisma.verification_token.create({
          data: {
            token: newCode,
            token_type: 'email_verification',
            user_id: existing.user_id,
            used: false,
            attempts: 0,
          },
        });

        this.emailService
          .sendVerificationCode(existing.email, newCode)
          .catch((e) => console.error('[Email resend error]', e));

        // Soft-OK: el front puede continuar a /verify sin mostrar 409
        return {
          message: 'Este correo ya tiene un registro pendiente. Reenviamos el código de verificación.',
          email_sent: true,
          user: { user_id: Number(existing.user_id), email: existing.email },
          already_exists: true,
        };
      }

      // Si ya está activo, sí devolvemos 409
      throw new ConflictException('El correo ya está registrado.');
    }

    // Prisma: base caída/no alcanzable
    if (error instanceof Prisma.PrismaClientInitializationError) {
      throw new ServiceUnavailableException(
        'No es posible conectar a la base de datos en este momento. Intenta más tarde.',
      );
    }

    // Prisma: transacción/engine ocupado (por si llegara a ocurrir en otro punto)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2028') {
      throw new InternalServerErrorException('El servidor está ocupado. Intenta de nuevo.');
    }

    console.error('[Register error]', error);
    throw new InternalServerErrorException(
      'Ocurrió un error al registrar al usuario. Intenta nuevamente más tarde.',
    );
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
          token_type: 'refreshToken',
          user_id: user.user_id,
          used: false,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
          attempts: 0,
        }
      });

      return {
        message: 'Login exitoso',
        accessToken: accessToken,
        refreshToken: refreshToken,
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

/** Verificar código de verificación */
  async verifyCode(dto: VerifyCodeDto) {
    const email = dto.email?.toLowerCase().trim();
    const code  = String(dto.code || '').trim();

    // Validación básica
    if (!email || !/^\d{6}$/.test(code)) {
      throw new UnauthorizedException('Código de verificación inválido o expirado');
    }

    const user = await this.prisma.users.findUnique({ where: { email } });
    if (!user) {
      // No revelar si el email existe
      throw new UnauthorizedException('Código de verificación inválido o expirado');
    }

    // Token válido y más reciente
    const token = await this.prisma.verification_token.findFirst({
      where: {
        user_id: user.user_id,
        token: code,
        token_type: 'email_verification',
        used: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' }
    });

    if (!token) {
      await this.incrementVerificationAttempts(user.user_id);
      throw new UnauthorizedException('Código de verificación inválido o expirado');
    }

    if ((token.attempts ?? 0) >= MAX_ATTEMPTS) {
      throw new UnauthorizedException('Demasiados intentos. Solicita un nuevo código.');
    }

    // Transacción: activar usuario + marcar token usado + invalidar otros
    await this.prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { user_id: user.user_id },
        data: { status: 'active' as status_user },
      });

      await tx.verification_token.update({
        where: { verification_token_id: token.verification_token_id },
        data: { used: true, used_at: new Date() /* NO increment attempts aquí */ },
      });

      await tx.verification_token.updateMany({
        where: {
          user_id: user.user_id,
          token_type: 'email_verification',
          used: false,
          verification_token_id: { not: token.verification_token_id },
        },
        data: { used: true },
      });
    });

    return { message: 'Usuario verificado exitosamente', user_id: Number(user.user_id) };
  }

  /** Incrementa intentos del último token pendiente */
  /** Incrementa intentos del último token pendiente */
/** Incrementa intentos del último token pendiente */
private async incrementVerificationAttempts(userId: bigint) {
  try {
    // 1. ENCONTRAR el token más reciente y no usado
    const latestToken = await this.prisma.verification_token.findFirst({
      where: {
        user_id: userId,
        token_type: 'email_verification',
        used: false,
        created_at: {
          gte: new Date(Date.now() - VERIFICATION_TTL_MS),
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // 2. ACTUALIZAR solo si se encontró un token
    if (latestToken) {
      await this.prisma.verification_token.update({
        where: {
          // 🎉 ¡CORRECCIÓN AQUÍ! Usamos el campo ID correcto: verification_token_id
          verification_token_id: latestToken.verification_token_id, 
        },
        data: {
          attempts: { increment: 1 },
        },
      });
    }
  } catch (e) {
    console.error('Error incrementando intentos:', e);
  }
}

  /** Reenviar código con TTL y cooldown */
  async resendCode(dto: ResendCodeDto) {
    const email = dto.email?.toLowerCase().trim();
    if (!email) {
      throw new BadRequestException('Email requerido');
    }

    const user = await this.prisma.users.findUnique({ where: { email } });
    if (!user) {
      // No revelar si existe
      return { message: 'Código de verificación reenviado exitosamente' };
    }

    // Cooldown: si hace muy poco se generó uno
    const recent = await this.prisma.verification_token.findFirst({
      where: {
        user_id: user.user_id,
        token_type: 'email_verification',
        created_at: { gte: new Date(Date.now() - RESEND_COOLDOWN_MS) },
        used: false,
      },
      orderBy: { created_at: 'desc' }
    });
    if (recent) {
      throw new HttpException('Espera unos segundos antes de pedir otro código.', 429);
    }

    // Invalidar pendientes
    await this.prisma.verification_token.updateMany({
      where: { user_id: user.user_id, token_type: 'email_verification', used: false },
      data: { used: true },
    });

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);

    await this.prisma.verification_token.create({
      data: {
        token: verificationCode,
        token_type: 'email_verification',
        user_id: user.user_id,
        used: false,
        attempts: 0,
        expires_at: expiresAt,
      },
    });

    await this.emailService.sendVerificationCode(user.email, verificationCode);
    return { message: 'Código de verificación reenviado exitosamente' };
  }

  // Refresh token
  async refreshToken(refreshToken: string) {
    try {
      // Verificar que el refresh token sea válido y no esté usado
      const tokenRecord = await this.prisma.verification_token.findFirst({
        where: {
          token: refreshToken,
          token_type: 'refreshToken',
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
          token_type: 'refreshToken',
          user_id: tokenRecord.user_id,
          used: false,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          attempts: 0,
        }
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };

    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      console.error('Error refrescando token:', error);
      throw new InternalServerErrorException('Error al refrescar el token');
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
          token_type: 'refreshToken',
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
}