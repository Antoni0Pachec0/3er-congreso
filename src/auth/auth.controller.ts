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
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@/auth/validation/guards/jwt.guard';
import { AuthService } from '@auth/auth.service';
import { CreateUserDto } from '@auth/dto/create-user.dto';
import { CreateLoginDto } from '@auth/dto/create-login.dto';
import { VerifyCodeDto } from '@auth/dto/verify-code.dto';
import { ResendCodeDto } from '@auth/dto/resend-code.dto';
import { Request, Response } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    email: string;
  };
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Registro de usuario con validación de entrada y errores personalizados */
  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado correctamente' })
  @ApiResponse({ status: 400, description: 'Error de validación' })
  @ApiResponse({ status: 409, description: 'Usuario ya registrado' })
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.createUser(createUserDto);
  }

  /** Login del usuario: genera tokens y setea cookies httpOnly seguras */
  @ApiOperation({ summary: 'Iniciar sesión con email y contraseña' })
  @ApiResponse({ status: 200, description: 'Inicio de sesión exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: CreateLoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.authService.loginUser(loginDto);

    // Guardar tokens como cookies httpOnly (seguras)
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 15, // 15 minutos
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
    });

    return { message: 'Inicio de sesión exitoso' };
  }

  /** Verificación del código enviado por email */
  @ApiOperation({ summary: 'Verificar cuenta con código enviado por correo' })
  @ApiResponse({ status: 200, description: 'Cuenta verificada exitosamente' })
  @ApiResponse({ status: 400, description: 'Código inválido o expirado' })
  @Post('verify')
  async verifyCode(@Body() verifyCodeDto: VerifyCodeDto) {
    return this.authService.verifyCode(verifyCodeDto);
  }

  /** Reenvía el código de verificación al correo del usuario */
  @ApiOperation({ summary: 'Reenviar código de verificación al correo electrónico' })
  @ApiResponse({ status: 200, description: 'Código reenviado correctamente' })
  @Post('resend-code')
  async resendCode(@Body() resendCodeDto: ResendCodeDto) {
    return this.authService.resendCode(resendCodeDto);
  }

  /** Devuelve perfil del usuario autenticado */
  @ApiOperation({ summary: 'Obtener el perfil del usuario autenticado' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Perfil obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.user.userId);
  }

  /** Cierra sesión eliminando cookies y refreshtoken */
  @ApiOperation({ summary: 'Cerrar sesión e invalidar refresh token' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Sesión cerrada exitosamente' })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Body() body: { refreshToken: string },
  ) {
    if (!body.refreshToken) {
      throw new BadRequestException('El refresh token es requerido para cerrar sesión');
    }

    await this.authService.logout(req.user.userId, body.refreshToken);

    // Limpiar cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return { message: 'Sesión cerrada correctamente' };
  }

  /** Refresca el token de acceso usando el refresh token */
  @ApiOperation({ summary: 'Obtener nuevo token de acceso con refresh token' })
  @ApiResponse({ status: 200, description: 'Token actualizado correctamente' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o expirado' })
  @Post('refresh')
  async refreshToken(@Body() body: { refreshToken: string }, @Res({ passthrough: true }) res: Response) {
    if (!body.refreshToken) {
      throw new BadRequestException('Refresh token es obligatorio');
    }

    const { accessToken, refreshToken } = await this.authService.refreshToken(body.refreshToken);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 15,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return { message: 'Token refrescado correctamente' };
  }
}
