import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com', description: 'Correo del usuario' })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({
    example: 'NewPassword123!',
    description: 'Nueva contraseña (mínimo 8 caracteres)',
  })
  @Length(8, 50, { message: 'La contraseña debe tener entre 8 y 50 caracteres' })
  password: string;
}
