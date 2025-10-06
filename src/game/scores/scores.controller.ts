// src/game/scores/scores.controller.ts
import { Controller, Post, Body, Get, Req, UseGuards, HttpException, HttpStatus, Param, ParseIntPipe } from '@nestjs/common';
import { ScoresService } from './scores.service';
import { CreateScoreDto } from './dto/create-score.dto';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';

@Controller('scores')
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req, @Body() dto: CreateScoreDto) {
    try {
      // ✅ el userId viene del token JWT
      const userId = BigInt(req.user.user_id || req.user.id || req.user.sub);
      
      if (!userId) {
        throw new HttpException('Usuario no autenticado', HttpStatus.UNAUTHORIZED);
      }

      return await this.scoresService.createScore(userId, dto);
    } catch (error) {
      throw new HttpException(
        `Error al guardar puntaje: ${error.message}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get('leaderboard')
  async getLeaderboard() {
    try {
      return await this.scoresService.getLeaderboard();
    } catch (error) {
      throw new HttpException(
        `Error al obtener leaderboard: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-best')
  async getMyBestScore(@Req() req) {
    try {
      const userId = BigInt(req.user.user_id || req.user.id || req.user.sub);
      return await this.scoresService.getUserBestScore(userId);
    } catch (error) {
      throw new HttpException(
        `Error al obtener mejor puntaje: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-scores')
  async getMyScores(@Req() req) {
    try {
      const userId = BigInt(req.user.user_id || req.user.id || req.user.sub);
      return await this.scoresService.getUserScores(userId);
    } catch (error) {
      throw new HttpException(
        `Error al obtener puntajes: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}