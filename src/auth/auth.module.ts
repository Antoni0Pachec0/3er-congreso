import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';


import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

/* import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy'; */


@Module({
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
