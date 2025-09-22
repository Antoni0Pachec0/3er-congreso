import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsEmail,
  MaxLength,
  MinLength,
  Length,
  Matches,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumberString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { size_enum, status_user } from '@prisma/client';

export class CreateUserDto {
  /** Nombre del usuario (solo letras y espacios, sin símbolos) */
  @ApiProperty({ example: 'Jony', description: 'Nombre del usuario' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100, { message: 'El nombre es demasiado largo' })
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/, {
    message: 'Solo se permiten letras y espacios',
  })
  @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
  name_user: string;

  /** Apellido paterno (solo letras y espacios) */
  @ApiProperty({ example: 'Smith', description: 'Apellido paterno del usuario' })
  @IsString({ message: 'El apellido paterno debe ser texto' })
  @IsNotEmpty({ message: 'El apellido paterno es obligatorio' })
  @MaxLength(100, { message: 'El apellido paterno es demasiado largo' })
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/, {
    message: 'Solo se permiten letras y espacios',
  })
  @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
  paternal_surname: string;

  /** Apellido materno (solo letras y espacios) */
  @ApiProperty({ example: 'Williams', description: 'Apellido materno del usuario' })
  @IsString({ message: 'El apellido materno debe ser texto' })
  @IsNotEmpty({ message: 'El apellido materno es obligatorio' })
  @MaxLength(100, { message: 'El apellido materno es demasiado largo' })
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/, {
    message: 'Solo se permiten letras y espacios',
  })
  @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
  maternal_surname: string;

  /** Teléfono principal con formato +52 y 10 dígitos */
  @ApiProperty({ example: '+525512345678', description: 'Teléfono del usuario (formato +52)' })
  @IsString({ message: 'El teléfono debe ser texto' })
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @Length(13, 13, { message: 'El teléfono debe tener exactamente 13 caracteres (ej: +525512345678)' })
  @Matches(/^\+52\d{10}$/, {
    message: 'Formato de teléfono inválido. Ej: +525512345678',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.replace(/[\s-]/g, '') : value)
  phone: string;

  /** Teléfono de emergencia con formato +52 y 10 dígitos */
  @ApiProperty({ example: '+525598765432', description: 'Teléfono de emergencia del usuario' })
  @IsString({ message: 'El teléfono debe ser texto' })
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @Length(13, 13, { message: 'El teléfono debe tener exactamente 13 caracteres (ej: +525512345678)' })
  @Matches(/^\+52\d{10}$/, {
    message: 'Formato de teléfono inválido. Ej: +525512345678',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.replace(/[\s-]/g, '') : value)
  emergency_phone: string;

  /** Correo electrónico del usuario (minúsculas) */
  @ApiProperty({ example: 'example@gmail.com', description: 'Correo electrónico del usuario' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  @IsEmail({}, { message: 'El email no es válido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  /** Contraseña con mínimo 8 caracteres y complejidad */
  @ApiProperty({ example: '#Duck123', description: 'Contraseña del usuario' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @IsString({ message: 'La contraseña debe ser texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message: 'Incluye mayúscula, minúscula, número y un caracter especial',
  })
  password_user: string;

  /** Universidad de procedencia */
  @ApiProperty({ example: 'Harvard', description: 'Universidad del usuario' })
  @IsNotEmpty({ message: 'La universidad es obligatoria' })
  @IsString({ message: 'La universidad debe ser texto' })
  @MaxLength(255, { message: 'La universidad es demasiado larga' })
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 ]+$/, {
    message: 'Solo se permiten letras, números y espacios',
  })
  @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
  provenance: string;

  /** Programa educativo (opcional) */
  @ApiProperty({ example: 'IT', description: 'Programa educativo del usuario' })
  @IsOptional()
  @IsString({ message: 'El programa educativo debe ser texto' })
  @MaxLength(155, { message: 'El programa educativo es demasiado largo' })
  @Transform(({ value }) => value?.trim())
  educational_program?: string;

  /** Grado escolar (opcional) */
  @ApiProperty({ example: '10', description: 'Grado escolar del usuario' })
  @IsOptional()
  @IsString({ message: 'El grado debe ser texto' })
  @Length(1, 2, { message: 'El grado debe tener entre 1 y 2 caracteres' })
  @Transform(({ value }) => value?.trim())
  grade?: string;

  /** Grupo (opcional) */
  @ApiProperty({ example: 'B', description: 'Grupo del usuario' })
  @IsOptional()
  @IsString({ message: 'El grupo debe ser texto' })
  @Length(1, 1, { message: 'El grupo debe tener solo 1 caracter' })
  @Transform(({ value }) => value?.trim())
  group_user?: string;

  /** Talla seleccionada (enum: S, M, L, XL, XXL, XXXL) */
  @ApiProperty({ example: 'M', enum: size_enum, description: 'Talla seleccionada por el usuario' })
  @IsOptional()
  @IsEnum(size_enum, { message: 'Talla no válida (S, M, L, XL, XXL, XXXL)' })
  size_user?: size_enum;

  /** ID del kit seleccionado (opcional) */
  @ApiProperty({ example: 1, description: 'ID del kit seleccionado' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El ID del kit debe ser un número' })
  kit_id?: number;

  /** ID del taller seleccionado (opcional) */
  @ApiProperty({ example: 2, description: 'ID del taller seleccionado' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El ID del taller debe ser un número' })
  workshop_id?: number;

  /** ID del tipo de usuario (opcional) */
  @ApiProperty({ example: 3, description: 'ID del tipo de usuario' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El tipo de usuario debe ser un número' })
  type_user_id?: number;

  /** Estado del usuario (enum: active, inactive, suspended, deleted) */
  @ApiProperty({ example: 'active', enum: status_user, description: 'Estado del usuario' })
  @IsOptional()
  @IsEnum(status_user, { message: 'Estado de usuario inválido' })
  status?: status_user;

  /** Estado de asistencia al evento (true o false) */
  @ApiProperty({ example: true, description: 'Asistencia del usuario al evento' })
  @IsOptional()
  @IsBoolean({ message: 'El estado del evento debe ser booleano (true o false)' })
  status_event?: boolean;

  /** Matrícula o número de control (opcional, numérica) */
  @ApiProperty({ example: '22307060', description: 'Matrícula del usuario' })
  @IsOptional()
  @IsString({ message: 'La matrícula debe ser texto' })
  @Length(1, 8, { message: 'La matrícula debe tener entre 1 y 8 dígitos' })
  @Matches(/^\d+$/, { message: 'La matrícula debe contener solo números' })
  @Transform(({ value }) => value ? value.trim().replace(/[^\d]/g, '') : value)
  matricula?: string;
}
