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
  IsEnum,
  IsBoolean,
  ValidateIf,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { size_enum, status_user } from '@prisma/client';

export class CreateUserDto {
  // --- Campos Principales y Obligatorios ---
  @ApiProperty({ example: 'Jony', description: 'Nombre del usuario' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100, { message: 'El nombre es demasiado largo' })
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑñ ]+$/, { message: 'Solo se permiten letras y espacios' })
  @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
  name_user: string;

  @ApiProperty({ example: 'Smith', description: 'Apellido paterno del usuario' })
  @IsString({ message: 'El apellido paterno debe ser texto' })
  @IsNotEmpty({ message: 'El apellido paterno es obligatorio' })
  @MaxLength(100, { message: 'El apellido paterno es demasiado largo' })
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑñ ]+$/, { message: 'Solo se permiten letras y espacios' })
  @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
  paternal_surname: string;

  @ApiProperty({ example: 'Williams', description: 'Apellido materno del usuario' })
  @IsString({ message: 'El apellido materno debe ser texto' })
  @IsNotEmpty({ message: 'El apellido materno es obligatorio' })
  @MaxLength(100, { message: 'El apellido materno es demasiado largo' })
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑñ ]+$/, { message: 'Solo se permiten letras y espacios' })
  @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
  maternal_surname: string;

  @ApiProperty({ example: '+525512345678', description: 'Teléfono del usuario' })
  @IsString({ message: 'El teléfono debe ser texto' })
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @Length(13, 13, { message: 'El teléfono debe tener exactamente 13 caracteres (ej: +525512345678)' })
  @Matches(/^\+52\d{10}$/, { message: 'Formato de teléfono inválido. Ej: +525512345678' })
  phone: string;

  @ApiProperty({ example: '+525598765432', description: 'Teléfono de emergencia del usuario' })
  @IsString({ message: 'El teléfono de emergencia debe ser texto' })
  @IsNotEmpty({ message: 'El teléfono de emergencia es obligatorio' })
  @Length(13, 13, { message: 'El teléfono de emergencia debe tener exactamente 13 caracteres' })
  @Matches(/^\+52\d{10}$/, { message: 'Formato de teléfono de emergencia inválido.' })
  emergency_phone: string;

  @ApiProperty({ example: 'example@gmail.com', description: 'Correo electrónico del usuario' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  @IsEmail({}, { message: 'El email no es válido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: '#Duck123', description: 'Contraseña del usuario' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @IsString({ message: 'La contraseña debe ser texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message: 'La contraseña debe incluir mayúscula, minúscula, número y un caracter especial',
  })
  password_user: string;
  
  // Se asume que este es un campo obligatorio
  @ValidateIf(o => [1, 2].includes(Number(o.type_user_id))) // solo estudiante(1)/docente(2)
  @IsString({ message: 'La procedencia debe ser texto' })
  @MaxLength(255, { message: 'La procedencia es demasiado larga' })
  @IsNotEmpty({ message: 'La procedencia es obligatoria' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  provenance?: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de usuario' })
  @Type(() => Number)
  @IsNumber({}, { message: 'El tipo de usuario debe ser un número' })
  @IsNotEmpty({ message: 'El tipo de usuario es obligatorio' })
  type_user_id: number;

  @ApiProperty({ example: 'M', enum: size_enum, description: 'Talla seleccionada' })
  @IsNotEmpty({ message: 'La talla es obligatoria' })
  @IsEnum(size_enum, { message: 'Talla no válida (S, M, L, XL, XXL, XXXL)' })
  size_user: size_enum;

  // --- Campos Condicionales ---
  // Campos de UTTECAM (provenance: 'uttecam')
  @ValidateIf(o => o.provenance === 'uttecam')
  @IsNotEmpty({ message: 'La matrícula es obligatoria para usuarios de UTTECAM' })
  @IsString({ message: 'La matrícula debe ser texto' })
  @Length(1, 8, { message: 'La matrícula debe tener entre 1 y 8 dígitos' })
  @Matches(/^\d+$/, { message: 'La matrícula debe contener solo números' })
  matricula?: string;

  @ValidateIf(o => o.provenance === 'uttecam')
  @IsNotEmpty({ message: 'El programa educativo es obligatorio para usuarios de UTTECAM' })
  @IsString({ message: 'El programa educativo debe ser texto' })
  @MaxLength(155, { message: 'El programa educativo es demasiado largo' })
  educational_program?: string;

  @ValidateIf(o => o.provenance === 'uttecam' && Number(o.type_user_id) === 1)
  @IsNotEmpty({ message: 'El grado es obligatorio para estudiantes de UTTECAM' })
  @IsString({ message: 'El grado debe ser texto' })
  @Length(1, 2, { message: 'El grado debe tener entre 1 y 2 caracteres' })
  grade?: string;

  @ValidateIf(o => o.provenance === 'uttecam' && Number(o.type_user_id) === 1)
  @IsNotEmpty({ message: 'El grupo es obligatorio para estudiantes de UTTECAM' })
  @IsString({ message: 'El grupo debe ser texto' })
  @Length(1, 1, { message: 'El grupo debe tener solo 1 caracter' })
  group_user?: string;

  // Campo de otra universidad (provenance: 'otra')
  @ValidateIf(o => o.provenance === 'otra')
  @IsNotEmpty({ message: 'La universidad de procedencia es obligatoria' })
  @IsString({ message: 'La universidad de procedencia debe ser texto' })
  @MaxLength(255, { message: 'La universidad de procedencia es demasiado larga' })
  universidad_procedencia?: string;

  // Campos de Ponente (type_user_id: 4)
  @ValidateIf(o => o.type_user_id === 4)
  @IsNotEmpty({ message: 'La empresa de procedencia es obligatoria para ponentes' })
  @IsString({ message: 'La empresa de procedencia debe ser texto' })
  empresa_procedencia?: string;

  @ValidateIf(o => o.type_user_id === 4)
  @IsNotEmpty({ message: 'El rol en la empresa es obligatorio para ponentes' })
  @IsString({ message: 'El rol en la empresa debe ser texto' })
  rol_dentro_empresa?: string;

  @ValidateIf(o => o.type_user_id === 4)
  @IsNotEmpty({ message: 'La biografía es obligatoria para ponentes' })
  @IsString({ message: 'La biografía debe ser texto' })
  descripcion_biografia?: string;

  @ValidateIf(o => o.type_user_id === 4)
  @IsNotEmpty({ message: 'El tipo de presentación es obligatorio para ponentes' })
  @IsString({ message: 'El tipo de presentación debe ser texto' })
  tipo_presentacion?: string;

  @ValidateIf(o => o.type_user_id === 4 && (o.tipo_presentacion === 'conferencia' || o.tipo_presentacion === 'ambas'))
  @IsNotEmpty({ message: 'El título de la conferencia es obligatorio' })
  @IsString({ message: 'El título de la conferencia debe ser texto' })
  titulo_conferencia?: string;

  @ValidateIf(o => o.type_user_id === 4 && (o.tipo_presentacion === 'conferencia' || o.tipo_presentacion === 'ambas'))
  @IsNotEmpty({ message: 'La descripción de la conferencia es obligatoria' })
  @IsString({ message: 'La descripción de la conferencia debe ser texto' })
  descripcion_conferencia?: string;

  @ValidateIf(o => o.type_user_id === 4 && (o.tipo_presentacion === 'taller' || o.tipo_presentacion === 'ambas'))
  @IsNotEmpty({ message: 'El título del taller es obligatorio' })
  @IsString({ message: 'El título del taller debe ser texto' })
  titulo_taller?: string;

  @ValidateIf(o => o.type_user_id === 4 && (o.tipo_presentacion === 'taller' || o.tipo_presentacion === 'ambas'))
  @IsNotEmpty({ message: 'La descripción del taller es obligatoria' })
  @IsString({ message: 'La descripción del taller es obligatoria' })
  descripcion_taller?: string;

  // ===================================
  // CAMPO PARA VALIDACIÓN DE PONENTE
  // ===================================
  @ApiProperty({
    example: 'ponente2024',
    description: 'Contraseña secreta para validar a ponentes/talleristas',
    required: false
  })
  @ValidateIf(o => o.type_user_id === 4)
  @IsString({
    message: 'La contraseña secreta debe ser texto'
  })
  @IsNotEmpty({
    message: 'La contraseña secreta es obligatoria para ponentes'
  })
  secret_password?: string;

  // ===================================
  // CAMPOS PARA REDES SOCIALES
  // ===================================
  @ApiProperty({
    example: 'https://www.facebook.com/johndoe',
    description: 'URL de perfil de Facebook',
    required: false
  })
  @IsOptional()
  @IsString({
    message: 'La URL de Facebook debe ser texto'
  })
  @IsUrl({}, {
    message: 'La URL de Facebook no es válida'
  })
  facebook_link?: string;

  @ApiProperty({
    example: 'https://www.instagram.com/johndoe',
    description: 'URL de perfil de Instagram',
    required: false
  })
  @IsOptional()
  @IsString({
    message: 'La URL de Instagram debe ser texto'
  })
  @IsUrl({}, {
    message: 'La URL de Instagram no es válida'
  })
  instagram_link?: string;

  @ApiProperty({
    example: 'https://www.x.com/johndoe',
    description: 'URL de perfil de X (Twitter)',
    required: false
  })
  @IsOptional()
  @IsString({
    message: 'La URL de X debe ser texto'
  })
  @IsUrl({}, {
    message: 'La URL de X no es válida'
  })
  x_link?: string;

  @ApiProperty({
    example: 'https://www.linkedin.com/in/johndoe',
    description: 'URL de perfil de LinkedIn',
    required: false
  })
  @IsOptional()
  @IsString({
    message: 'La URL de LinkedIn debe ser texto'
  })
  @IsUrl({}, {
    message: 'La URL de LinkedIn no es válida'
  })
  linkedin_link?: string;
}