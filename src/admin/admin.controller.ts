// src/admin/admin.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/validation/guards/jwt.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { AdminService } from './admin.service';
import { UpdateUserActivationDto } from './dto/update-user-activation.dto';

interface AuthReq {
  user?: { userId: number; email: string };
}

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({ summary: 'Obtener opciones de filtro dinámicas' })
  @ApiResponse({ status: 200, description: 'OK' })
  @Get('users/filter-options') // 👈 NUEVO ENDPOINT
  async getFilterOptions() {
    return this.adminService.getFilterOptions();
  }

  @ApiOperation({ summary: 'Listar usuarios (paginado + filtros)' })
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiQuery({ name: 'q', required: false, description: 'Búsqueda general' })
  @ApiQuery({ name: 'filter', required: false, description: 'Filtro por tipo/estado/pago' })
  @ApiQuery({ name: 'grade', required: false, description: 'Filtro por grado (ej: 1A, 2B)' })
  @ApiQuery({ name: 'group', required: false, description: 'Filtro por grupo (ej: A, B, C)' })
  @ApiQuery({ name: 'page', required: false, description: 'Página' })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Tamaño de página' })
  @Get('users')
  async listUsers(
    @Query('q') q?: string,
    @Query('filter') filter?: string,
    @Query('grade') grade?: string,
    @Query('group') group?: string,
    @Query('page', new DefaultValuePipe(1)) page: string | number = 1,
    @Query('pageSize', new DefaultValuePipe(20)) pageSize: string | number = 20,
  ) {
    const p = Number.isFinite(+page) && +page > 0 ? +page : 1;
    const ps = Number.isFinite(+pageSize) && +pageSize > 0 ? +pageSize : 20;
    return this.adminService.listUsers({ 
      q, 
      filter, 
      grade, 
      group, 
      page: p, 
      pageSize: ps 
    });
  }

  @ApiOperation({ summary: 'Activar/Desactivar funciones del evento para un usuario' })
  @ApiResponse({ status: 200, description: 'OK' })
  @Patch('users/:id/activation')
  async activation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserActivationDto,
    @Req() req: AuthReq,
  ) {
    return this.adminService.setUserEventActivation({
      actorUserId: req.user?.userId,
      userId: id,
      activate: dto.activate,
      force: dto.force,
      reason: dto.reason,
    });
  }
}