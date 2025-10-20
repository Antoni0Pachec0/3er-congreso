//dto para talleres
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateWorkshopDto {
  @IsString()
  @IsNotEmpty()
  title: string;

}