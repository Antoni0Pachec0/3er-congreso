import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { CreateUserDto } from '@auth/dto/create-user.dto';
import { CreateLoginDto } from '@auth/dto/create-login.dto';
import { VerifyCodeDto } from '@auth/dto/verify-code.dto';
import { ResendCodeDto } from '@auth/dto/resend-code.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '@auth/email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  // Crear nuevo usuario
  async createUser(dto: CreateUserDto) {
    const email = dto.email.toLowerCase().trim();

    // Verificar si el correo ya está registrado
    const exists = await this.prisma.users.findUnique({
      where: { email },
    });

    if (exists) {
      throw new ConflictException('El correo ya está registrado');
    }

    // Hashear la contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    try {
      // Crear usuario
      const user = await this.prisma.users.create({
        data: {
          name_user: dto.name,
          paternal_surname: dto.paternal_surname,
          maternal_surname: dto.maternal_surname,
          phone: dto.phone,
          emergency_phone: dto.phone_emergency,
          email,
          password_user: hashedPassword,
          provenance: dto.university,
          educational_program: dto.educational_program,
          grade: dto.grade,
          group_user: dto.group,
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

      // Transformar BigInt a Number para la respuesta
      const userResponse = {
        ...user,
        user_id: Number(user.user_id), // Convertir BigInt a Number
      };

      // Enviar correo de verificación
      const verificationCode = Math.floor(100000 + Math.random() * 900000);
      await this.emailService.sendVerificationCode(user.email, verificationCode.toString());

      return {
        message: 'Usuario creado exitosamente. Se ha enviado un correo de verificación.',
        user: userResponse,
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Error al crear el usuario');
    }
  }

  // Iniciar sesión (login)
  async loginUser(dto: CreateLoginDto) {
    const user = await this.prisma.users.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new ConflictException('Las credenciales son incorrectas');
    }

    // Comparar contraseñas
    const isPasswordValid = await bcrypt.compare(dto.password, user.password_user);
    if (!isPasswordValid) {
      throw new ConflictException('Las credenciales son incorrectas');
    }

    // Crear JWT (access token)
    const payload = { userId: Number(user.user_id) }; // Convertir BigInt a Number
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      message: 'Login exitoso',
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  // Verificar código de verificación
  async verifyCode(dto: VerifyCodeDto) {
    const user = await this.prisma.users.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new ConflictException('Usuario no encontrado');
    }

    // Aquí deberías verificar el código enviado, lo cual puede implicar
    // verificar si el código de verificación existe y ha expirado.
    // Este paso es solo un ejemplo; necesitarás adaptarlo según tu flujo.
    const isValidCode = true; // Asume que el código es válido (por ejemplo, consulta una tabla de códigos)

    if (!isValidCode) {
      throw new ConflictException('Código de verificación inválido');
    }

    // Actualizar el estado de verificación del usuario
    await this.prisma.users.update({
      where: { email: dto.email },
      data: { verified: true },
    });

    return { message: 'Usuario verificado exitosamente' };
  }

  // Obtener perfil de usuario
  async getProfile(userId: number) {
    const user = await this.prisma.users.findUnique({
      where: { user_id: userId },
    });

    if (!user) {
      throw new ConflictException('Usuario no encontrado');
    }

    // Devolver solo los datos públicos, sin la contraseña
    const { password_user, ...profile } = user;
    
    // Transformar BigInt a Number
    return {
      ...profile,
      user_id: Number(profile.user_id), // Convertir BigInt a Number
    };
  }

  // Logout (invalidar refresh token)
  async logout(userId: number) {
    // Aquí podrías invalidar el refresh token del usuario si lo estás usando para manejar sesiones.
    // Si usas solo JWT en el frontend, no necesitas invalidar nada (el token simplemente expira).
    return;
  }

  // Reenviar código de verificación
  async resendCode(dto: ResendCodeDto) {
    const user = await this.prisma.users.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new ConflictException('Usuario no encontrado');
    }

    // Generar y enviar nuevo código de verificación
    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    await this.emailService.sendVerificationCode(user.email, verificationCode.toString());

    return { message: 'Código de verificación reenviado exitosamente' };
  }
}