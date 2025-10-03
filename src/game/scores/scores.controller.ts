// scores.controller.ts
import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { ScoresService } from './scores.service';
import { CreateScoreDto } from './dto/create-score.dto';
// usa el MISMO guard del resto del proyecto
import { JwtAuthGuard } from '@/auth/validation/guards/jwt.guard';

@Controller('scores')
export class ScoresController {
  constructor(private scoresService: ScoresService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req, @Body() dto: CreateScoreDto) {
    // JwtStrategy -> validate() devuelve { userId, email }
    const userIdBigint = BigInt(req.user.userId);
    return this.scoresService.createScore(userIdBigint, dto);
  }

  @Get('leaderboard')
  async getLeaderboard() {
    return this.scoresService.getLeaderboard();
  }
}
