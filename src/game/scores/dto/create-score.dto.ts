import { IsNumber, IsPositive } from 'class-validator';

export class CreateScoreDto {
  @IsNumber()
  @IsPositive()
  value: number;

  @IsNumber()
  @IsPositive()
  game_score_id: bigint;
}