import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '@/auth/validation/guards/jwt.guard';

class ListUsersQueryDto {
  q?: string;
  filter?: string;
  grade?: string;
  group?: string;
  page!: number;
  pageSize!: number;
}

class ToggleActivationDto {
  activate!: boolean;
  // opcional: alinear tipos con el service
  reason?: string;        // <- antes: string | null
  force?: boolean;
}

class BulkActivationDto {
  ids!: number[];
  activate!: boolean;
  force?: boolean;
}

@Controller('admin/users')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('filter-options')
  async getFilterOptions() {
    return this.adminService.getFilterOptions();
  }

  @Get()
  async listUsers(@Query() qdto: ListUsersQueryDto) {
    const page = Number(qdto.page ?? 1);
    const pageSize = Number(qdto.pageSize ?? 20);
    if (!Number.isFinite(page) || page < 1) throw new BadRequestException('page inválida');
    if (!Number.isFinite(pageSize) || pageSize < 1) throw new BadRequestException('pageSize inválido');

    return this.adminService.listUsers({
      q: qdto.q,
      filter: qdto.filter,
      grade: qdto.grade,
      group: qdto.group,
      page,
      pageSize,
    });
  }

  @Patch(':id/activation')
  async setActivation(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ToggleActivationDto,
  ) {
    const activate = !!body.activate;
    return this.adminService.setUserEventActivation({
      userId: id,
      activate,
      force: body.force ?? true,
      // ⬇️ normaliza a undefined para que cumpla reason?: string
      reason: body.reason ?? undefined,
    });
  }

  @Patch('activation-bulk')
  async bulkActivation(@Body() body: BulkActivationDto) {
    const ids = Array.isArray(body.ids) ? body.ids : [];
    if (ids.length === 0) throw new BadRequestException('Debes enviar al menos un ID');

    return this.adminService.setUsersEventActivationBulk({
      ids,
      activate: !!body.activate,
      force: body.force ?? true,
      // ⬇️ no envíes null; omítelo o envía undefined
      // reason: undefined,
    });
  }
}
