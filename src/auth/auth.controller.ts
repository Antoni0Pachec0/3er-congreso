import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '@/auth/validation/guards/jwt.guard';
import { AuthService } from '@auth/auth.service';
import type { LoginResult } from '@auth/auth.service';
import { CreateUserDto } from '@auth/dto/create-user.dto';
import { CreateLoginDto } from '@auth/dto/create-login.dto';
import { VerifyCodeDto } from '@auth/dto/verify-code.dto';
import { ResendCodeDto } from '@auth/dto/resend-code.dto';
import { ForgotPasswordDto } from '@auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '@auth/dto/reset-password.dto';
import { Request, Response } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    email: string;
  };
}

@ApiTags('Auth')
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado correctamente' })
  @ApiResponse({ status: 400, description: 'Error de validación' })
  @ApiResponse({ status: 409, description: 'Usuario ya registrado' })
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @Post('register')
  async register(
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    // 1. Llamar al servicio, que setea la cookie en 'res'.
    const result = await this.authService.createUser(createUserDto, res);
    return result;
  }

  @ApiOperation({ summary: 'Verificar contraseña secreta para registro de ponentes' })
  @ApiResponse({ status: 200, description: 'Contraseña de ponente válida' })
  @ApiResponse({ status: 401, description: 'Contraseña de ponente inválida' })
  @Throttle({ default: { limit: 10, ttl: 60 } }) // Opcional: Recomendado para prevenir ataques de fuerza bruta
  @Post('speakers/check-secret')
  checkSpeakerSecret(@Body() body: { secret_password: string }) {
    const secret = (process.env.SPEAKER_SECRET || '').trim();

    // La excepción correcta para credenciales inválidas es 401 Unauthorized
    if (!secret || (body.secret_password || '').trim() !== secret) {
      throw new UnauthorizedException('Contraseña de ponente inválida');
    }

    return { ok: true };
  }

  @ApiOperation({ summary: 'Solicitar recuperación de contraseña' })
  @ApiResponse({ status: 200, description: 'Código enviado al correo si existe' })
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @ApiOperation({ summary: 'Restablecer contraseña' })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada correctamente' })
  @ApiResponse({ status: 400, description: 'Error de validación' })
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @ApiOperation({ summary: 'Iniciar sesión con email y contraseña' })
  @ApiResponse({ status: 200, description: 'Inicio de sesión exitoso o verificación requerida' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: CreateLoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.loginUser(loginDto) as LoginResult;

    if ('require_verification' in result && result.require_verification) {
      return result; // retorna tal cual cuando la cuenta está inactiva
    }

    const { accessToken, refreshToken, user_id, message } = result as {
      accessToken: string;
      refreshToken: string;
      user_id: number;
      message: string;
    };

    // Cookies persistentes sin variables auxiliares:
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 1000 * 60 * 15,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    return { message, user_id };
  }

  @ApiOperation({ summary: 'Verificar cuenta con código enviado por correo' })
  @ApiResponse({ status: 200, description: 'Cuenta verificada exitosamente' })
  @ApiResponse({ status: 400, description: 'Código inválido o expirado' })
  @Throttle({ default: { limit: 5, ttl: 60 * 5 } })
  @Post('verify')
  async verifyCode(@Body() verifyCodeDto: VerifyCodeDto) {
    return this.authService.verifyCode(verifyCodeDto);
  }

  @ApiOperation({ summary: 'Reenviar código de verificación al correo electrónico' })
  @ApiResponse({ status: 200, description: 'Código reenviado correctamente' })
  @Throttle({ default: { limit: 2, ttl: 60 * 60 } })
  @Post('resend-code')
  async resendCode(@Body() resendCodeDto: ResendCodeDto) {
    return this.authService.resendCode(resendCodeDto);
  }

  @ApiOperation({ summary: 'Obtener el perfil del usuario autenticado' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Perfil obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.user.userId);
  }

  @ApiOperation({ summary: 'Cerrar sesión e invalidar refresh token' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Sesión cerrada exitosamente' })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies['refreshToken'];
    if (refreshToken) {
      await this.authService.logout(req.user.userId, refreshToken);
    }
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return { message: 'Sesión cerrada correctamente' };
  }

  @ApiOperation({ summary: 'Obtener nuevo token de acceso con refresh token' })
  @ApiResponse({ status: 200, description: 'Token actualizado correctamente' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o expirado' })
  @Post('refresh')
  async refreshToken(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refreshToken'];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token no encontrado');
    }

    const rt = req.cookies['refreshToken'];
    if (!rt) throw new UnauthorizedException('Refresh token no encontrado');

    const { accessToken, refreshToken: newRefreshToken } = await this.authService.refreshToken(rt);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 1000 * 60 * 15,
    });
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return { message: 'Token refrescado correctamente' };

  }
}