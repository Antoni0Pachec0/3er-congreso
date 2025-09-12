import { ApiProperty } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsEmail, MaxLength, MinLength, Length, Matches, IsOptional, IsNumberString
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {

  /** User's first name */
  @ApiProperty({ example: 'Jony', description: 'User name' })
  @IsString({ message: 'El nombre no debe contener números o caracteres especiales' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(80, { message: 'El nombre es demasiado largo' })
  // Only letters (with accents) and spaces
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/, {
    message: 'El nombre no debe contener números o caracteres especiales',
  })
  // NOTE: Transform runs before validation if ValidationPipe has transform:true
  @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
  public name_user: string;

  /** User's paternal surname */
  @ApiProperty({ example: 'Smith', description: 'Paternal surname' })
  @IsString({ message: 'El apellido paterno debe ser texto' })
  @IsNotEmpty({ message: 'El apellido paterno es obligatorio' })
  @MaxLength(80, { message: 'El apellido paterno es demasiado largo' })
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/, {
    message: 'El apellido paterno no debe contener números o caracteres especiales',
  })
  @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
  public paternal_surname: string;

  /** User's maternal surname */
  @ApiProperty({ example: 'Williams', description: 'Maternal surname' })
  @IsString({ message: 'El apellido materno debe ser texto' })
  @IsNotEmpty({ message: 'El apellido materno es obligatorio' })
  @MaxLength(80, { message: 'El apellido materno es demasiado largo' })
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/, {
    message: 'El apellido materno no debe contener números o caracteres especiales',
  })
  @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
  public maternal_surname: string;

  /** Phone in E.164, Mexico +52 + 10 digits */
  @ApiProperty({
    example: '+525512345678',
    description: 'Phone with country code (+52 in Mexico) and 10 digits',
  })
  @IsString({ message: 'El teléfono debe ser texto' })
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  // After normalization, it must be +52 + 10 digits → total length 13
  @Length(13, 13, { message: 'El teléfono debe incluir +52 y 10 dígitos (ej: +525512345678)' })
  @Matches(/^\+52\d{10}$/, {
    message: 'El teléfono debe incluir +52 seguido de 10 dígitos (ej: +525512345678)',
  })
  // Normalize: remove spaces/dashes so it matches +52##########
  @Transform(({ value }) => typeof value === 'string'
    ? value.replace(/[\s-]/g, '') : value)
  public phone: string;

   /** Phone in E.164, Mexico +52 + 10 digits */
  @ApiProperty({
    example: '+525512345678',
    description: 'Emergency Phone to User',
  })
  @IsString({ message: 'El teléfono debe ser texto' })
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  // After normalization, it must be +52 + 10 digits → total length 13
  @Length(13, 13, { message: 'El teléfono debe incluir +52 y 10 dígitos (ej: +525512345678)' })
  @Matches(/^\+52\d{10}$/, {
    message: 'El teléfono debe incluir +52 seguido de 10 dígitos (ej: +525512345678)',
  })
  // Normalize: remove spaces/dashes so it matches +52##########
  @Transform(({ value }) => typeof value === 'string'
    ? value.replace(/[\s-]/g, '') : value)
  public emergency_phone: string;

  /** User email (lowercased) */
  @ApiProperty({ example: 'example@gmail.com', description: 'User email' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  @IsEmail({}, { message: 'El email no es válido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  public email: string;

  /** User password (min requirements) */
  @ApiProperty({ example: '#Duck123', description: 'User password' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @IsString({ message: 'La contraseña debe ser texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  // Optional: enforce complexity policy if you want
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
  message: 'Incluye mayúscula, minúscula, número y un caracter especial',
  })
  public password_user: string;

  /** University name (letters, spaces and digits, no symbols) */
  @ApiProperty({ example: 'Harvard', description: 'User university' })
  @IsNotEmpty({ message: 'La universidad es obligatoria' })
  @IsString({ message: 'La universidad debe ser texto' })
  @MaxLength(80, { message: 'La universidad es demasiado larga' })
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 ]+$/, {
    message: 'La universidad solo puede contener letras, espacios y números (sin símbolos)',
  })
  @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
  public provenance: string;

  /** Educational program (optional text) */
  @ApiProperty({ example: 'IT', description: 'Educational program' })
  @IsOptional()
  @IsString({ message: 'El programa educativo debe ser texto' })
  @MaxLength(120, { message: 'El programa educativo es demasiado largo' })
  @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
  public educational_program?: string;

  /** Grade (optional, small text) */
  @ApiProperty({ example: '10', description: 'User grade' })
  @IsOptional()
  @IsString({ message: 'El grado debe ser texto' })
  @MaxLength(30, { message: 'El grado es demasiado largo' })
  @Transform(({ value }) => value?.trim())
  public grade?: string;

  /** Group (optional, small text) */
  @ApiProperty({ example: 'B', description: 'User group' })
  @IsOptional()
  @IsString({ message: 'El grupo debe ser texto' })
  @MaxLength(30, { message: 'El grupo es demasiado largo' })
  @Transform(({ value }) => value?.trim())
  public group_user?: string;

  /** Selected size_user */
  @ApiProperty({ example: 'G', description: 'Selected size user' })
  @IsString({ message: 'La talla de la playera debe de ser texto' })
  @MaxLength(10, { message: 'La talla es demaciado grande' })
  @Transform(({ value }) => value?.trim())
  public size_user: string;

  /** Selected kit (catalog/text) */
  @ApiProperty({ example: '1', description: 'Selected kit ID' })
  @IsOptional()
  @IsNumberString({}, { message: 'El kit debe ser un número' })
  @Transform(({ value }) => value?.trim())
  public kit_id?: string;

  /** Selected workshop (catalog/text) */
  @ApiProperty({ example: '1', description: 'Selected workshop ID' })
  @IsOptional()
  @IsNumberString({}, { message: 'El taller debe ser un número' })
  @Transform(({ value }) => value?.trim())
  public workshop_id?: string;

  /** Selected type user */
  @ApiProperty({ example: '1' })
  @IsOptional()  // ← Hacer opcional
  @IsNumberString({}, { message: 'El tipo de usuario debe ser un número' })
  @Transform(({ value }) => value?.trim())
  public type_user_id?: string;

/** status predeterminated */
  @ApiProperty({ example: 'active' })
  @IsString({ message: 'El estado debe ser texto' })
  @MaxLength(50, { message: 'El estado es demasiado largo' })
  @Transform(({ value }) => value?.trim())
  public status: string;
}
