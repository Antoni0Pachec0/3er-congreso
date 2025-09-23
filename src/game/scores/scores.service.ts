// En tu archivo scores.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateScoreDto } from './dto/create-score.dto';

@Injectable()
export class ScoresService {
  constructor(private prisma: PrismaService) {}

  async createScore(userId: bigint, dto: CreateScoreDto) {
    const userBigIntId = userId; // Asegúrate de que userId es bigint

    // 1. Busca el mejor puntaje actual del usuario.
    const userBestScore = await this.prisma.game_score.findFirst({
      where: { user_id: userBigIntId },
      orderBy: { score: 'desc' },
    });

    // 2. Compara el nuevo puntaje con el mejor actual.
    if (!userBestScore || dto.value > userBestScore.score) {
      // 3. Si ya existe un puntaje, actualízalo.
      if (userBestScore) {
        const updatedScore = await this.prisma.game_score.update({
          where: { game_score_id: userBestScore.game_score_id },
          data: { score: dto.value },
        });

        return {
          ...updatedScore,
          game_score_id: updatedScore.game_score_id.toString(),
          user_id: updatedScore.user_id ? updatedScore.user_id.toString() : null,
        };
      } else {
        // 4. Si es el primer puntaje del usuario, créalo.
        const newScore = await this.prisma.game_score.create({
          data: {
            game_score_id: dto.game_score_id,
            score: dto.value,
            user_id: userBigIntId,
          },
        });

        return {
          ...newScore,
          game_score_id: newScore.game_score_id.toString(),
          user_id: newScore.user_id ? newScore.user_id.toString() : null,
        };
      }
    }
    // Si el nuevo puntaje no es un récord, devuelve el puntaje existente sin modificar.
    return {
      ...userBestScore,
      game_score_id: userBestScore.game_score_id.toString(),
      user_id: userBestScore.user_id ? userBestScore.user_id.toString() : null,
    };
  }

  // Los métodos getLeaderboard y getUserBestScore están correctos
  // y no necesitan cambios para resolver este problema.
  async getLeaderboard() {
    const leaderboard = await this.prisma.game_score.findMany({
      orderBy: { score: 'desc' },
      take: 10,
      include: { users: { select: { user_id: true, name_user: true, email: true } } },
    });

    return leaderboard.map(score => ({
      ...score,
      game_score_id: score.game_score_id.toString(),
      user_id: score.user_id ? score.user_id.toString() : null,
    }));
  }

  async getUserBestScore(userId: number) {
    const scores = await this.prisma.game_score.findMany({
      where: { user_id: userId },
      orderBy: { score: 'desc' },
      take: 1,
    });
    
    if (scores[0]) {
      return {
        ...scores[0],
        game_score_id: scores[0].game_score_id.toString(),
        user_id: scores[0].user_id ? scores[0].user_id.toString() : null,
      };
    }

    return null;
  }
}