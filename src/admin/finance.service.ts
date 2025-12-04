import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { Prisma } from '@prisma/client';

type ListMovementsArgs = {
  tipo?: 'INGRESO' | 'GASTO';
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
      throw new BadRequestException('El precio del evento debe ser mayor a 0.');
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
      throw new BadRequestException('El nombre de la categoría es obligatorio.');
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
  // 📌 LISTAR MOVIMIENTOS
  // ============================================================
  async listMovements({ tipo, categoriaId }: ListMovementsArgs) {
    const where: Prisma.movimientos_financierosWhereInput = {};

    if (tipo === 'INGRESO' || tipo === 'GASTO') {
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
      tipo: updated.tipo,
      fecha: updated.fecha,
      monto: (updated.monto as Prisma.Decimal).toNumber(),
      descripcion: updated.descripcion,
      medio_pago: updated.medio_pago,
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
}
