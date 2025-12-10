// finance.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { join } from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

type ListMovementsArgs = {
  tipo?: 'INGRESO' | 'GASTO' | 'ALL';
  categoriaId?: number;
};

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // 📌 RESUMEN GENERAL DE FINANZAS
  // ============================================================
  async getSummary(price: number) {
    if (Number.isNaN(price) || price <= 0) {
      throw new BadRequestException(
        'El precio del evento debe ser mayor a 0.',
      );
    }

    const paidUsersCount = await this.prisma.users.count({
      where: { status_event: true },
    });

    const [ingresosAgg, gastosAgg] = await this.prisma.$transaction([
      this.prisma.movimientos_financieros.aggregate({
        _sum: { monto: true },
        where: { tipo: 'INGRESO' },
      }),
      this.prisma.movimientos_financieros.aggregate({
        _sum: { monto: true },
        where: { tipo: 'GASTO' },
      }),
    ]);

    const totalIngresosDb =
      (ingresosAgg._sum.monto as Prisma.Decimal | null)?.toNumber() ?? 0;
    const totalGastosDb =
      (gastosAgg._sum.monto as Prisma.Decimal | null)?.toNumber() ?? 0;

    const ticketsRevenue = paidUsersCount * price;
    const balance = ticketsRevenue + totalIngresosDb - totalGastosDb;

    return {
      paidUsersCount,
      ticketPrice: price,
      ticketsRevenue,
      totalIngresosDb,
      totalGastosDb,
      balance,
    };
  }

  // ============================================================
  // 📌 LISTAR CATEGORÍAS
  // ============================================================
  async listCategories() {
    const categories = await this.prisma.categoria_movimiento.findMany({
      orderBy: { nombre: 'asc' },
    });

    return categories.map((c) => ({
      id: Number(c.id_categoria),
      nombre: c.nombre,
      descripcion: c.descripcion,
    }));
  }

  // ============================================================
  // 📌 CREAR CATEGORÍA
  // ============================================================
  async createCategory(dto: { nombre: string; descripcion?: string }) {
    if (!dto.nombre?.trim()) {
      throw new BadRequestException(
        'El nombre de la categoría es obligatorio.',
      );
    }

    const created = await this.prisma.categoria_movimiento.create({
      data: {
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim() || null,
      },
    });

    return {
      id: Number(created.id_categoria),
      nombre: created.nombre,
      descripcion: created.descripcion,
    };
  }

  // ============================================================
  // ✏️ ACTUALIZAR CATEGORÍA
  // ============================================================
  async updateCategory(
    id: number,
    dto: { nombre: string; descripcion?: string },
  ) {
    if (!dto.nombre?.trim()) {
      throw new BadRequestException(
        'El nombre de la categoría es obligatorio.',
      );
    }

    const exists = await this.prisma.categoria_movimiento.findUnique({
      where: { id_categoria: BigInt(id) },
    });

    if (!exists) {
      throw new NotFoundException('La categoría no existe.');
    }

    const updated = await this.prisma.categoria_movimiento.update({
      where: { id_categoria: BigInt(id) },
      data: {
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim() || null,
      },
    });

    return {
      id: Number(updated.id_categoria),
      nombre: updated.nombre,
      descripcion: updated.descripcion,
    };
  }

  // ============================================================
  // 🗑️ ELIMINAR CATEGORÍA (solo si no tiene movimientos)
  // ============================================================
  async deleteCategory(id: number) {
    const exists = await this.prisma.categoria_movimiento.findUnique({
      where: { id_categoria: BigInt(id) },
    });

    if (!exists) {
      throw new NotFoundException('La categoría no existe.');
    }

    const count = await this.prisma.movimientos_financieros.count({
      where: { id_categoria: BigInt(id) },
    });

    if (count > 0) {
      throw new BadRequestException(
        `No se puede eliminar la categoría porque tiene ${count} movimientos asociados.`,
      );
    }

    await this.prisma.categoria_movimiento.delete({
      where: { id_categoria: BigInt(id) },
    });

    return { success: true, message: 'Categoría eliminada correctamente.' };
  }

  // ============================================================
  // 📌 LISTAR MOVIMIENTOS
  // ============================================================
  async listMovements({ tipo, categoriaId }: ListMovementsArgs) {
    const where: Prisma.movimientos_financierosWhereInput = {};

    if (tipo && tipo !== 'ALL') {
      where.tipo = tipo;
    }

    if (categoriaId) {
      where.id_categoria = BigInt(categoriaId);
    }

    const movimientos = await this.prisma.movimientos_financieros.findMany({
      where,
      orderBy: { fecha: 'desc' },
      include: {
        categoria_movimiento: true,
        users: {
          select: {
            user_id: true,
            name_user: true,
            paternal_surname: true,
            maternal_surname: true,
            email: true,
          },
        },
      },
    });

    return movimientos.map((m) => ({
      id: Number(m.id_movimiento),
      tipo: m.tipo as 'INGRESO' | 'GASTO',
      fecha: m.fecha,
      monto: (m.monto as Prisma.Decimal).toNumber(),
      descripcion: m.descripcion,
      medio_pago: m.medio_pago,
      id_categoria: m.id_categoria ? Number(m.id_categoria) : 0,
      categoria: m.categoria_movimiento
        ? {
            id: Number(m.categoria_movimiento.id_categoria),
            nombre: m.categoria_movimiento.nombre,
          }
        : null,
      usuario: m.users
        ? {
            id: Number(m.users.user_id),
            nombre: [
              m.users.name_user,
              m.users.paternal_surname,
              m.users.maternal_surname,
            ]
              .filter(Boolean)
              .join(' '),
            email: m.users.email,
          }
        : null,
    }));
  }

  // ============================================================
  // 📌 CREAR MOVIMIENTO
  // ============================================================
  async createMovement(dto: {
    tipo: 'INGRESO' | 'GASTO';
    monto: number;
    descripcion?: string;
    medio_pago: 'EFECTIVO' | 'TARJETA';
    id_categoria: number;
    id_usuario?: number | null;
  }) {
    if (!['INGRESO', 'GASTO'].includes(dto.tipo)) {
      throw new BadRequestException('tipo debe ser INGRESO o GASTO.');
    }
    if (dto.monto == null || dto.monto < 0) {
      throw new BadRequestException('monto debe ser mayor o igual a 0.');
    }
    if (!['EFECTIVO', 'TARJETA'].includes(dto.medio_pago)) {
      throw new BadRequestException('medio_pago debe ser EFECTIVO o TARJETA.');
    }
    if (!dto.id_categoria) {
      throw new BadRequestException('id_categoria es obligatorio.');
    }

    const created = await this.prisma.movimientos_financieros.create({
      data: {
        tipo: dto.tipo,
        monto: new Prisma.Decimal(dto.monto),
        descripcion: dto.descripcion?.trim() || null,
        medio_pago: dto.medio_pago,
        id_categoria: BigInt(dto.id_categoria),
        id_usuario: dto.id_usuario ? BigInt(dto.id_usuario) : null,
      },
      include: {
        categoria_movimiento: true,
        users: {
          select: {
            user_id: true,
            name_user: true,
            paternal_surname: true,
            maternal_surname: true,
            email: true,
          },
        },
      },
    });

    return {
      id: Number(created.id_movimiento),
      tipo: created.tipo as 'INGRESO' | 'GASTO',
      fecha: created.fecha,
      monto: (created.monto as Prisma.Decimal).toNumber(),
      descripcion: created.descripcion,
      medio_pago: created.medio_pago,
      id_categoria: created.id_categoria
        ? Number(created.id_categoria)
        : dto.id_categoria,
      categoria: created.categoria_movimiento
        ? {
            id: Number(created.categoria_movimiento.id_categoria),
            nombre: created.categoria_movimiento.nombre,
          }
        : null,
      usuario: created.users
        ? {
            id: Number(created.users.user_id),
            nombre: [
              created.users.name_user,
              created.users.paternal_surname,
              created.users.maternal_surname,
            ]
              .filter(Boolean)
              .join(' '),
            email: created.users.email,
          }
        : null,
    };
  }

  // ============================================================
  // 📌 ACTUALIZAR MOVIMIENTO
  // ============================================================
  async updateMovement(
    id: number,
    dto: {
      tipo: 'INGRESO' | 'GASTO';
      monto: number;
      descripcion?: string;
      medio_pago: 'EFECTIVO' | 'TARJETA';
      id_categoria: number;
      id_usuario?: number | null;
    },
  ) {
    const exists = await this.prisma.movimientos_financieros.findUnique({
      where: { id_movimiento: BigInt(id) },
    });

    if (!exists) {
      throw new NotFoundException('El movimiento no existe.');
    }

    const updated = await this.prisma.movimientos_financieros.update({
      where: { id_movimiento: BigInt(id) },
      data: {
        tipo: dto.tipo,
        monto: new Prisma.Decimal(dto.monto),
        descripcion: dto.descripcion?.trim() || null,
        medio_pago: dto.medio_pago,
        id_categoria: BigInt(dto.id_categoria),
        id_usuario: dto.id_usuario ? BigInt(dto.id_usuario) : null,
      },
      include: {
        categoria_movimiento: true,
        users: {
          select: {
            user_id: true,
            name_user: true,
            paternal_surname: true,
            maternal_surname: true,
            email: true,
          },
        },
      },
    });

    return {
      id: Number(updated.id_movimiento),
      tipo: updated.tipo as 'INGRESO' | 'GASTO',
      fecha: updated.fecha,
      monto: (updated.monto as Prisma.Decimal).toNumber(),
      descripcion: updated.descripcion,
      medio_pago: updated.medio_pago,
      id_categoria: updated.id_categoria
        ? Number(updated.id_categoria)
        : dto.id_categoria,
      categoria: updated.categoria_movimiento
        ? {
            id: Number(updated.categoria_movimiento.id_categoria),
            nombre: updated.categoria_movimiento.nombre,
          }
        : null,
      usuario: updated.users
        ? {
            id: Number(updated.users.user_id),
            nombre: [
              updated.users.name_user,
              updated.users.paternal_surname,
              updated.users.maternal_surname,
            ]
              .filter(Boolean)
              .join(' '),
            email: updated.users.email,
          }
        : null,
    };
  }

  // ============================================================
  // 📌 ELIMINAR MOVIMIENTO
  // ============================================================
  async deleteMovement(id: number) {
    const exists = await this.prisma.movimientos_financieros.findUnique({
      where: { id_movimiento: BigInt(id) },
    });

    if (!exists) {
      throw new NotFoundException('El movimiento no existe.');
    }

    await this.prisma.movimientos_financieros.delete({
      where: { id_movimiento: BigInt(id) },
    });

    return { success: true, message: 'Movimiento eliminado correctamente.' };
  }

  // ============================================================
  // 📄 GENERAR PDF DE MOVIMIENTOS (CON MEMBRETE)
  // ============================================================
  async exportMovementsPdf(filters: ListMovementsArgs): Promise<Buffer> {
    try {
      const movimientos = await this.listMovements(filters);

      return await new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument({
          size: 'LETTER',
          margin: 40,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: Error) => reject(err));

        // Fondo membretado (opcional)
        try {
          const bgPath = join(
            process.cwd(),
            'public',
            'finance',
            'report-bg.png',
          );
          doc.image(bgPath, 0, 0, {
            width: doc.page.width,
            height: doc.page.height,
          });
        } catch {
          // Si no existe la imagen, solo se queda fondo blanco
        }

        // Encabezado
        doc
          .font('Helvetica-Bold')
          .fontSize(18)
          .fillColor('#000000')
          .text('Reporte de movimientos financieros', {
            align: 'center',
          });

        doc.moveDown(0.5);
        doc
          .font('Helvetica')
          .fontSize(11)
          .text(
            `Tipo: ${
              filters.tipo && filters.tipo !== 'ALL' ? filters.tipo : 'Todos'
            } · Categoría: ${
              filters.categoriaId ? filters.categoriaId : 'Todas'
            }`,
            { align: 'center' },
          );

        doc.moveDown(1);

        // Encabezados de tabla
        const startY = doc.y;
        doc.fontSize(11).font('Helvetica-Bold');

        doc.text('Fecha', 40, startY);
        doc.text('Tipo', 110, startY);
        doc.text('Descripción', 160, startY);
        doc.text('Categoría', 330, startY);
        doc.text('Medio', 430, startY);
        doc.text('Monto', 500, startY, { width: 80, align: 'right' });

        doc.moveTo(40, startY + 14).lineTo(560, startY + 14).stroke();

        // Filas
        doc.font('Helvetica').fontSize(10);
        let y = startY + 20;
        let total = 0;

        for (const m of movimientos) {
          if (y > doc.page.height - 60) {
            doc.addPage();
            y = 40;
          }

          const fechaStr = new Date(m.fecha).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });

          doc.text(fechaStr, 40, y);
          doc.text(m.tipo === 'INGRESO' ? 'Ingreso' : 'Gasto', 110, y);
          doc.text(m.descripcion ?? '-', 160, y, { width: 160 });
          doc.text(m.categoria?.nombre ?? '-', 330, y, { width: 90 });
          doc.text(m.medio_pago ?? '-', 430, y, { width: 60 });
          doc.text(m.monto.toFixed(2), 500, y, { width: 80, align: 'right' });

          total += m.monto;
          y += 18;
        }

        // Total
        doc.moveDown(2);
        doc.font('Helvetica-Bold').fontSize(12);
        doc.text(`TOTAL: $${total.toFixed(2)}`, 400, y + 10, {
          width: 180,
          align: 'right',
        });

        doc.end();
      });
    } catch (err: any) {
      // Esto se propagará como 400 con mensaje claro al frontend
      throw new BadRequestException(
        `Error al generar el PDF de movimientos: ${err?.message || 'Error desconocido.'}`,
      );
    }
  }
}
