// scores.controller.ts
import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { ScoresService } from './scores.service';
import { CreateScoreDto } from './dto/create-score.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('scores')
export class ScoresController {
  constructor(private scoresService: ScoresService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req, @Body() dto: CreateScoreDto) {
    // Convierte el ID del usuario a BigInt en el controlador.
    const userId = BigInt(req.user.user_id);
    return this.scoresService.createScore(userId, dto);
  }

  @Get('leaderboard')
  async getLeaderboard() {
    return this.scoresService.getLeaderboard();
  }
}