import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '@prisma/prisma.service';
import { EmailService } from './validation/email/email.service';
import { JwtStrategy } from './validation/strategies/jwt.strategy';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'defaultSecret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, EmailService, JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}