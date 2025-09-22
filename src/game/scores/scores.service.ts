import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateScoreDto } from './dto/create-score.dto';

@Injectable()
export class ScoresService {
  constructor(private prisma: PrismaService) {}

  async createScore(userId: number, dto: CreateScoreDto) {
    return this.prisma.game_score.create({
      data: {
        game_score_id: Date.now(), 
        score: dto.value,
        user_id: userId,
      },
    });
  }

  async getLeaderboard() {
    return this.prisma.game_score.findMany({
      orderBy: { score: 'desc' },
      take: 10,
      include: { users: { select: { user_id: true, name_user: true, email: true } } },
    });
  }

  async getUserBestScore(userId: number) {
    const scores = await this.prisma.game_score.findMany({
      where: { user_id: userId },
      orderBy: { score: 'desc' },
      take: 1,
    });
    return scores[0] || null;
  }
}