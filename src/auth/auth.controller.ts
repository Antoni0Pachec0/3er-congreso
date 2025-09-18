import { Controller, Post, Body, Get, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@/auth/validation/guards/jwt.guard';
import { AuthService } from '@auth/auth.service';
import { CreateUserDto } from '@auth/dto/create-user.dto';
import { CreateLoginDto } from '@auth/dto/create-login.dto';
import { VerifyCodeDto } from '@auth/dto/verify-code.dto';
import { ResendCodeDto } from '@auth/dto/resend-code.dto';
import { Request } from 'express';

// Interfaz para el usuario en el request JWT
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
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Successfully fetched user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req: AuthenticatedRequest) {
    // El guard JWT ya validó y adjuntó el usuario al request
    return this.authService.getProfile(req.user.userId);
  }

  // Cerrar sesión (invalidar refresh token)
  @ApiOperation({ summary: 'Logout user (invalidate refresh token)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: AuthenticatedRequest, @Body() body: { refresh_token: string }) {
    // Necesitamos el refresh token para invalidarlo específicamente
    if (!body.refresh_token) {
      throw new Error('Refresh token is required for logout');
    }
    return this.authService.logout(req.user.userId, body.refresh_token);
  }

  // Refresh token (obtener nuevos tokens)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @Post('refresh')
  async refreshToken(@Body() body: { refresh_token: string }) {
    if (!body.refresh_token) {
      throw new Error('Refresh token is required');
    }
    return this.authService.refreshToken(body.refresh_token);
  }
}