import { Controller, Post, Body, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@auth/guards/jwt.guard'; // Para proteger rutas con JWT
import { AuthService } from '@auth/auth.service'; // Servicio de autenticación
import { CreateUserDto } from '@auth/dto/create-user.dto'; // DTO para crear usuario
import { CreateLoginDto } from '@auth/dto/create-login.dto'; // DTO para login
import { VerifyCodeDto } from '@auth/dto/verify-code.dto'; // DTO para verificar código
import { ResendCodeDto } from '@auth/dto/resend-code.dto'; // DTO para reenvío de código

@ApiTags('Auth') // Etiqueta para Swagger
@Controller('auth') // Prefijo para las rutas
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Registro de usuario
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.createUser(createUserDto);
  }

  // Login de usuario
  @ApiOperation({ summary: 'Login user with email and password' })
  @ApiResponse({ status: 200, description: 'Logged in successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Post('login')
  async login(@Body() loginDto: CreateLoginDto) {
    return this.authService.loginUser(loginDto);
  }

  // Verificación de código
  @ApiOperation({ summary: 'Verify user account using code sent to email' })
  @ApiResponse({ status: 200, description: 'Account verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  @Post('verify')
  async verifyCode(@Body() verifyCodeDto: VerifyCodeDto) {
    return this.authService.verifyCode(verifyCodeDto);
  }

  // Reenvío de código de verificación
  @ApiOperation({ summary: 'Resend verification code' })
  @ApiResponse({ status: 200, description: 'Verification code resent' })
  @Post('resend-code')
  async resendCode(@Body() resendCodeDto: ResendCodeDto) {
    return this.authService.resendCode(resendCodeDto);
  }

  // Obtener perfil del usuario (requiere JWT)
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiBearerAuth() // Indica que se requiere un token JWT en el header
  @ApiResponse({ status: 200, description: 'Successfully fetched user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard) // Protege esta ruta con un guard JWT
  @Get('me')
  async getProfile(@Body() user) {
    return this.authService.getProfile(user.userId); // Aquí debes obtener datos del usuario autenticado
  }

  // Cerrar sesión (invalidar JWT)
  @ApiOperation({ summary: 'Logout user (invalidate JWT)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 204, description: 'Successfully logged out' })
  @HttpCode(HttpStatus.NO_CONTENT) // No content porque no devuelve respuesta
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Body() user) {
    return this.authService.logout(user.userId); // Invalidar refresh token o sesión
  }
}
