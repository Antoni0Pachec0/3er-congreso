import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer'; 
import { IsString, IsNotEmpty, Length, IsNumber, Min, Max, IsDate, Matches} from 'class-validator';

export class CreateWorkshopScheduleDto {

// description of the event ( workshop) 
  @ApiProperty({
    description: 'Descripción del evento',
    example: 'Un taller sobre como la IA está cambiando el mundo',
    minLength: 10,
    maxLength: 100,
  })
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @Length(10, 100, { message: 'La descripción debe tener entre 10 y 100 caracteres' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  descriptionWorshop: string;

  // name of the speaker for workshops
  @ApiProperty({
    description: 'Nombre del ponente',
    example: 'Juan',
    minLength: 3,
    maxLength: 30,
  })
  @IsString({ message: 'El nombre del tallerista debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre del tallerista es obligatorio' })
  @Length(3, 30, { message: 'El nombre del tallerista debe tener entre 3 y 30  caracteres' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  workshopleader: string;

  // paternal surname of the speaker for workshops
  @ApiProperty({
    description: 'Apellido paterno del ponente',
    example: 'Perez',
    minLength: 3,
    maxLength: 50,
  })
  @IsString({ message: 'El apellido paterno del ponente debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El apellido paterno del ponente es obligatorio' })
  @Length(3, 50, { message: 'El apellido paterno del ponente debe tener entre 3 y 50 caracteres' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  leaderPaternalSurname: string;

    // maternal surname of the speaker for workshops
  @ApiProperty({
    description: 'Apellido materno del ponente',
    example: 'Gomez',
    minLength: 3,
    maxLength: 50,
  })
  @IsString({ message: 'El apellido materno del ponente debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El apellido materno del ponente es obligatorio' })
  @Length(3, 50, { message: 'El apellido materno del ponente debe tener entre 3 y 50 caracteres' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  leaderMaternalSurname: string;

// workshop name
  @ApiProperty({
    description: 'Nombre del taller',
    example: 'La Inteligencia Artificial en la Vida Cotidiana',
    minLength: 3,
    maxLength: 50,
    required: false,
  })
  
  @IsString({ message: 'El nombre del taller debe ser una cadena de texto' })
  @Length(3, 50, { message: 'El nombre del taller debe tener entre 3 y 50 caracteres' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'El nombre del taller no puede estar vacío', each: true })
  @IsNotEmpty({ message: 'Si se proporciona, el nombre del taller no puede estar vacío' })
  // making it optional
  @Transform(({ value }) => (value === '' ? undefined : value)) // if empty string, set to undefined
  workshopName?: string;


// maximum capacity of attendees with workshops
  @ApiProperty({
    description: 'Capacidad máxima de asistentes',
    minimum: 1,
    maximum: 20,
  })
  @IsNumber({}, { message: 'La capacidad debe ser un número' })
  @Min(1, { message: 'La capacidad debe ser al menos 1' })
  @Max(20, { message: 'La capacidad no puede ser mayor de 20' })
  @IsNotEmpty({ message: 'La capacidad es obligatoria' })
  capacityWorkshop: number;

// location of the workshop, building and living room
  @ApiProperty({
    description: 'Ubicación del taller (edificio y salón)',
    example: 'Edificio K, Salón K10',
    minLength: 5,
    maxLength: 50,
  })
  @IsString({ message: 'La ubicación debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La ubicación es obligatoria' })
  @Length(5, 50, { message: 'La ubicación debe tener entre 5 y 50 caracteres' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  locationWorkshop: string;

  // date of the workshop
    @ApiProperty({
      description: 'Fecha del taller en formato ISO (YYYY-MM-DD)',
      example: '2025-11-15',
      
    })
    @Type(() => Date)
    @IsDate({ message: 'La fecha debe ser una fecha válida (formato YYYY-MM-DD)' })
    @IsNotEmpty({ message: 'La fecha es obligatoria' })
    dateWorkshop: Date;

  // start time of the workshop
    @ApiProperty({
      description: 'Hora de inicio del taller en formato HH:mm (24 horas)',
      example: '14:30',
      
    })
    @IsString({ message: 'La hora de inicio debe ser una cadena de texto' })
    @IsNotEmpty({ message: 'La hora de inicio es obligatoria' })
    @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
      message: 'La hora de inicio debe tener el formato HH:mm (24 horas)',
    })
    startTimeWorkshop: string;

  // end time of the workshop
    @ApiProperty({
      description: 'Hora de fin del evento en formato HH:mm (24 horas)',
      example: '16:00',
  
    })
    @IsString({ message: 'La hora de fin debe ser una cadena de texto' })
    @IsNotEmpty({ message: 'La hora de fin es obligatoria' })
    @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
      message: 'La hora de fin debe tener el formato HH:mm (24 horas)',
    })
    endTimeWorkshop: string;


}