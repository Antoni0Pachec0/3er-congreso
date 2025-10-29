// src/workshop/dto/workshop-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsDate, IsEnum, IsBoolean } from 'class-validator';
import { status_enum } from '@prisma/client';

export class WorkshopResponseDto {
  @ApiProperty({ example: 1, description: 'ID del taller' })
  @IsNumber()
  workshop_id: number;

  @ApiProperty({ example: 'Taller de Programación Avanzada', description: 'Nombre del taller' })
  @IsString()
  @IsOptional()
  name_workshop?: string;

  @ApiProperty({ example: 'Aprende programación avanzada con NestJS y Prisma', description: 'Descripción del taller' })
  @IsString()
  @IsOptional()
  descript?: string;

  @ApiProperty({ example: 30, description: 'Cupo máximo del taller' })
  @IsNumber()
  @IsOptional()
  spots_max?: number;

  @ApiProperty({ example: 15, description: 'Cupos ocupados del taller' })
  @IsNumber()
  @IsOptional()
  spots_occupied?: number;

  @ApiProperty({ example: 'Edificio A', description: 'Edificio donde se imparte el taller' })
  @IsString()
  @IsOptional()
  building?: string;

  @ApiProperty({ example: 'Aula 101', description: 'Aula donde se imparte el taller' })
  @IsString()
  @IsOptional()
  classroom?: string;

  @ApiProperty({ example: 'active', description: 'Estado del taller', enum: status_enum })
  @IsEnum(status_enum)
  @IsOptional()
  status?: status_enum;

  @ApiProperty({ example: 1, description: 'ID del instructor del taller' })
  @IsNumber()
  @IsOptional()
  instructor_user_id?: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Fecha de creación' })
  @IsDate()
  @IsOptional()
  created_at?: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Fecha de actualización' })
  @IsDate()
  @IsOptional()
  updated_at?: Date;

  @ApiProperty({ example: 'Juan Pérez', description: 'Nombre del instructor' })
  @IsString()
  @IsOptional()
  instructor_name?: string;

  @ApiProperty({ example: false, description: 'Si el usuario está inscrito en este taller' })
  @IsBoolean()
  @IsOptional()
  is_user_enrolled?: boolean;

  @ApiProperty({ example: false, description: 'Si el usuario puede inscribirse' })
  @IsBoolean()
  @IsOptional()
  can_enroll?: boolean;

  @ApiProperty({ 
    example: 'available', 
    description: 'Estado de inscripción', 
    enum: ['not_authenticated', 'needs_payment', 'can_enroll', 'already_enrolled'] 
  })
  @IsString()
  @IsOptional()
  enrollment_status?: string;

  @ApiProperty({ example: 5, description: 'Cupos disponibles' })
  @IsNumber()
  @IsOptional()
  available_spots?: number;

  @ApiProperty({ example: 'Inscribirse', description: 'Texto del botón según el estado' })
  @IsString()
  @IsOptional()
  button_text?: string;

  @ApiProperty({ example: false, description: 'Si el botón está deshabilitado' })
  @IsBoolean()
  @IsOptional()
  button_disabled?: boolean;

  @ApiProperty({ example: 'default', description: 'Tipo de botón', enum: ['default', 'warning', 'success', 'danger'] })
  @IsString()
  @IsOptional()
  button_type?: string;
}