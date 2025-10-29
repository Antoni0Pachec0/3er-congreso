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
  DefaultValuePipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '@/auth/validation/guards/jwt.guard';

@Controller('admin/users')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('filter-options')
  async getFilterOptions() {
    return this.adminService.getFilterOptions();
  }

  @Get()
  async listUsers(
    @Query('q') q?: string,
    @Query('filter') filter?: string,
    @Query('grade') grade?: string,
    @Query('group') group?: string,
    @Query('page', new DefaultValuePipe(1)) page: number = 1,
    @Query('pageSize', new DefaultValuePipe(20)) pageSize: number = 20,
  ) {
    // Validación básica
    if (page < 1) throw new BadRequestException('page debe ser mayor a 0');
    if (pageSize < 1 || pageSize > 200) {
      throw new BadRequestException('pageSize debe estar entre 1 y 200');
    }

    return this.adminService.listUsers({
      q,
      filter,
      grade,
      group,
      page,
      pageSize,
    });
  }

  @Patch(':id/activation')
  async setActivation(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { 
      activate: boolean; 
      force?: boolean; 
      reason?: string;
      status_event?: boolean; // 👈 NUEVO: campo explícito para estado de pago
    },
  ) {
    return this.adminService.setUserEventActivation({
      userId: id,
      activate: body.activate,
      force: body.force ?? false,
      reason: body.reason,
      status_event: body.status_event ?? body.activate, // 👈 Usar el valor enviado o activate como fallback
    });
  }

  @Patch('activation-bulk')
  async bulkActivation(@Body() body: { 
    ids: number[]; 
    activate: boolean; 
    force?: boolean;
    status_event?: boolean; // 👈 NUEVO: campo explícito para estado de pago
  }) {
    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      throw new BadRequestException('Debes enviar al menos un ID');
    }

    return this.adminService.setUsersEventActivationBulk({
      ids: body.ids,
      activate: body.activate,
      force: body.force ?? false,
      status_event: body.status_event ?? body.activate, // 👈 Usar el valor enviado
    });
  }
}