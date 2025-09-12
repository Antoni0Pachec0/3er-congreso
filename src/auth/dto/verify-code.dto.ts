import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class VerifyCodeDto {
  /** User email */
  @ApiProperty({ example: 'user@example.com', description: 'User email for verification' })
  @IsEmail({}, { message: 'El email debe ser válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  public email: string;

  /** Verification code */
  @ApiProperty({ example: '123456', description: 'Verification code sent to email' })
  @IsString({ message: 'El código de verificación debe ser un texto' })
  @IsNotEmpty({ message: 'El código de verificación es obligatorio' })
  public code: string;
}
