// finance.controller.ts
import {
  Controller,
  Param,
  Put,
  Delete,
  Get,
  Post,
  Body,
  Query,
  DefaultValuePipe,
  ParseFloatPipe,
  ParseIntPipe,
  UseGuards,
  Header,
  StreamableFile,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/validation/guards/jwt.guard';
import { FinanceService } from './finance.service';

@UseGuards(JwtAuthGuard)
@Controller('admin/finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ============================================================
  // 📌 RESUMEN GENERAL
  // GET /admin/finance/summary?price=380
  // ============================================================
  @Get('summary')
  async getSummary(
    @Query('price', new DefaultValuePipe(380), ParseFloatPipe)
    price: number,
  ) {
    return this.financeService.getSummary(price);
  }

  // ============================================================
  // 📌 LISTAR CATEGORÍAS
  // GET /admin/finance/categories
  // ============================================================
  @Get('categories')
  async listCategories() {
    return this.financeService.listCategories();
  }

  // ============================================================
  // 📌 CREAR CATEGORÍA
  // POST /admin/finance/categories
  // body: { nombre: string, descripcion?: string }
  // ============================================================
  @Post('categories')
  async createCategory(
    @Body()
    body: {
      nombre: string;
      descripcion?: string;
    },
  ) {
    return this.financeService.createCategory(body);
  }

  // ============================================================
  // 📌 ACTUALIZAR CATEGORÍA
  // PUT /admin/finance/categories/:id
  // body: { nombre: string, descripcion?: string }
  // ============================================================
  @Put('categories/:id')
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      nombre: string;
      descripcion?: string;
    },
  ) {
    return this.financeService.updateCategory(id, body);
  }

  // ============================================================
  // 📌 ELIMINAR CATEGORÍA
  // DELETE /admin/finance/categories/:id
  // (solo se eliminará si no tiene movimientos asociados)
  // ============================================================
  @Delete('categories/:id')
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.financeService.deleteCategory(id);
  }

  // ============================================================
  // 📌 LISTAR MOVIMIENTOS
  // GET /admin/finance/movements?tipo=INGRESO|GASTO&categoriaId=1
  // ============================================================
  @Get('movements')
  async listMovements(
    @Query('tipo') tipo?: 'INGRESO' | 'GASTO',
    @Query('categoriaId', new DefaultValuePipe(0), ParseIntPipe)
    categoriaId?: number,
  ) {
    const cat = categoriaId && categoriaId > 0 ? categoriaId : undefined;

    return this.financeService.listMovements({
      tipo,
      categoriaId: cat,
    });
  }

  // ============================================================
  // 📌 CREAR MOVIMIENTO
  // POST /admin/finance/movements
  // ============================================================
  @Post('movements')
  async createMovement(
    @Body()
    body: {
      tipo: 'INGRESO' | 'GASTO';
      monto: number;
      descripcion?: string;
      medio_pago: 'EFECTIVO' | 'TARJETA';
      id_categoria: number;
      id_usuario?: number | null;
    },
  ) {
    return this.financeService.createMovement(body);
  }

  // ============================================================
  // 📌 ACTUALIZAR MOVIMIENTO
  // PUT /admin/finance/movements/:id
  // ============================================================
  @Put('movements/:id')
  async updateMovement(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      tipo: 'INGRESO' | 'GASTO';
      monto: number;
      descripcion?: string;
      medio_pago: 'EFECTIVO' | 'TARJETA';
      id_categoria: number;
      id_usuario?: number | null;
    },
  ) {
    return this.financeService.updateMovement(id, body);
  }

  // ============================================================
  // 📌 ELIMINAR MOVIMIENTO
  // DELETE /admin/finance/movements/:id
  // ============================================================
  @Delete('movements/:id')
  async deleteMovement(@Param('id', ParseIntPipe) id: number) {
    return this.financeService.deleteMovement(id);
  }

  // ============================================================
  // 📌 GENERAR PDF DE MOVIMIENTOS
  // GET /admin/finance/movements/pdf?tipo=GASTO&categoriaId=1
  // - tipo: INGRESO | GASTO | ALL (opcional, default ALL)
  // - categoriaId: número, opcional
  // ============================================================
  @Get('movements/pdf')
  @Header('Content-Type', 'application/pdf')
  @Header(
    'Content-Disposition',
    'attachment; filename="reporte-financiero.pdf"',
  )
  async exportMovementsPdf(
    @Query('tipo') tipo: 'INGRESO' | 'GASTO' | 'ALL' = 'ALL',
    @Query('categoriaId', new DefaultValuePipe(0), ParseIntPipe)
    categoriaId: number,
  ): Promise<StreamableFile> {
    const buffer = await this.financeService.exportMovementsPdf({
      tipo,
      categoriaId: categoriaId > 0 ? categoriaId : undefined,
    });

    return new StreamableFile(buffer);
  }
}
