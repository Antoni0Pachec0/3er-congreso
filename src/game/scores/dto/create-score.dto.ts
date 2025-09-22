import { IsInt, IsPositive } from 'class-validator';

export class CreateScoreDto {
  @IsInt()
  @IsPositive()
  value: number;
}