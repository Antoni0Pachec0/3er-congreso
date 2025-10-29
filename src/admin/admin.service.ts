import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { Prisma, status_user } from '@prisma/client';

import {
  buildMultiTermSearch,
  normalizeGrade,
  normalizeGroup,
  splitGradeGroup,
} from '@/common/utils/normalize-academics';

type ListArgs = {
  q?: string;
  filter?: string; // "Estudiante", "Activo", "Pagado" o pares "status:active,type:Estudiante,event:true"
  grade?: string;  // "1", "1°", "1A", "10", etc.
  group?: string;  // "a"/"A" (se normaliza a "A")
  page: number;
  pageSize: number;
};

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) { }

  /** Devuelve opciones de filtros normalizadas y deduplicadas */
  async getFilterOptions() {
    const [gradesRaw, groupsRaw, types] = await Promise.all([
      this.prisma.users.findMany({
        where: {
          grade: { not: null },
          status: { not: 'deleted' } // 👈 Excluir eliminados
        },
        select: { grade: true },
        distinct: ['grade'],
      }),
      this.prisma.users.findMany({
        where: {
          group_user: { not: null },
          status: { not: 'deleted' } // 👈 Excluir eliminados
        },
        select: { group_user: true },
        distinct: ['group_user'],
      }),
      this.prisma.type_user.findMany({
        select: { type_user_id: true, name_type: true }
      }),
    ]);

    const gradeSet = new Set<string>();
    for (const g of gradesRaw) {
      const norm = normalizeGrade(g.grade ?? undefined);
      if (norm) gradeSet.add(norm);
    }

    // 👈 MEJORA: Ordenar numéricamente incluyendo grado 10
    const grades = Array.from(gradeSet)
      .map(Number)
      .sort((a, b) => a - b)
      .map(String)
      .filter(grade => grade && ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].includes(grade));

    const groupSet = new Set<string>();
    for (const g of groupsRaw) {
      const norm = normalizeGroup(g.group_user ?? undefined);
      if (norm) groupSet.add(norm);
    }
    const groups = Array.from(groupSet).sort((a, b) => a.localeCompare(b, 'es'));

    return {
      grades,
      groups,
      types: types.map(t => ({ id: Number(t.type_user_id), name: t.name_type })),
      statuses: ['active', 'inactive', 'suspended', 'deleted'],
      eventStatuses: [true, false],
    };
  }

  /** Parser mejorado de filtro combinado */
  private parseFilterKV(filter?: string) {
    if (!filter) return {};

    // Si el filtro es una palabra simple (no contiene ':'), devolver objeto vacío
    if (!filter.includes(':')) return {};

    const obj: Record<string, string> = {};
    for (const part of filter.split(',').map(s => s.trim()).filter(Boolean)) {
      const [k, v] = part.split(':').map(x => x?.trim());
      if (k && v) obj[k.toLowerCase()] = v;
    }
    return obj;
  }

  async listUsers({ q, filter, grade, group, page, pageSize }: ListArgs) {
    // 👈 NUEVO: Ignorar filtro si es "Todos"
    const effectiveFilter = filter === 'Todos' ? undefined : filter;

    // ——— Normalización de grado/grupo
    let gradeNorm: string | null = null;
    let groupNorm: string | null = null;

    if (grade) {
      if (grade === '10' || grade.toLowerCase().includes('10')) {
        gradeNorm = '10';
      } else {
        const split = splitGradeGroup(grade);
        gradeNorm = split.grade ?? null;
        if (!group && split.group) groupNorm = split.group;
      }
    }

    if (group && !groupNorm) groupNorm = normalizeGroup(group);

    // ——— Búsqueda multi-término
    const terms = (q ?? '').split(/\s+/).filter(Boolean);
    const searchWhere = buildMultiTermSearch(terms);

    // ——— Filtros (usa effectiveFilter en lugar de filter)
    const parsed = this.parseFilterKV(effectiveFilter);
    const where: Prisma.usersWhereInput = {
      ...(searchWhere || {}),
      ...(gradeNorm ? { grade: { equals: gradeNorm } } : {}),
      ...(groupNorm ? { group_user: { equals: groupNorm } } : {}),
    };

    // Filtros por nombre simple (solo si effectiveFilter existe)
    if (effectiveFilter && !effectiveFilter.includes(':')) {
      // Tipos por nombre visible
      if (['Estudiante', 'Docente', 'Ponente/Tallerista', 'Externo', 'Admin'].includes(effectiveFilter)) {
        where.type_user = { name_type: { equals: effectiveFilter, mode: 'insensitive' } };
      }
      // Estado visible
      else if (['Activo', 'Inactivo', 'Suspendido', 'Eliminado'].includes(effectiveFilter)) {
        const map: Record<string, status_user> = {
          'Activo': 'active',
          'Inactivo': 'inactive',
          'Suspendido': 'suspended',
          'Eliminado': 'deleted',
        };
        where.status = map[effectiveFilter];
      }
      // Filtro por pago
      else if (['Pagado', 'No pagado'].includes(effectiveFilter)) {
        where.status_event = effectiveFilter === 'Pagado';
      }
    }

    // Filtros por clave:valor
    if (parsed.status) {
      const v = parsed.status.toLowerCase();
      if (['active', 'inactive', 'suspended', 'deleted'].includes(v)) {
        where.status = v as status_user;
      }
    }
    if (parsed.type) {
      where.type_user = { name_type: { equals: parsed.type, mode: 'insensitive' } };
    }
    if (parsed.event === 'true') where.status_event = true;
    if (parsed.event === 'false') where.status_event = false;
    if (parsed.payment === 'true') where.status_event = true;
    if (parsed.payment === 'false') where.status_event = false;

    // Resto del código igual...
    const take = Math.max(1, Math.min(200, pageSize));
    const skip = Math.max(0, (page - 1) * take);

    const select: Prisma.usersSelect = {
      user_id: true,
      name_user: true,
      paternal_surname: true,
      maternal_surname: true,
      email: true,
      phone: true,
      matricula: true,
      educational_program: true,
      provenance: true,
      grade: true,
      group_user: true,
      status: true,
      status_event: true,
      type_user: { select: { name_type: true } },
      Payment: {
        select: {
          paymentStatus: true,
          status: true,
          paymentIntentStatus: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.users.count({ where }),
      this.prisma.users.findMany({
        where,
        select,
        orderBy: { user_id: 'desc' },
        skip,
        take,
      }),
    ]);

    const data = rows.map(r => {
      const lastPay = r.Payment?.[0];
      const paid = !!lastPay && (
        lastPay.paymentStatus?.toLowerCase?.() === 'paid' ||
        lastPay.status?.toLowerCase?.() === 'paid' ||
        lastPay.paymentIntentStatus?.toLowerCase?.() === 'succeeded'
      );

      return {
        id: Number(r.user_id),
        name: [r.name_user, r.paternal_surname, r.maternal_surname].filter(Boolean).join(' '),
        email: r.email,
        phone: r.phone,
        code: r.matricula ?? String(r.user_id),
        provenance: r.provenance ?? null,
        educational_program: r.educational_program ?? null,
        grade: normalizeGrade(r.grade ?? null),
        group: normalizeGroup(r.group_user ?? null),
        type: r.type_user?.name_type ?? 'Externo',
        isActive: r.status === 'active',
        eventEnabled: !!r.status_event,
        status_event: !!r.status_event,
        paymentStatus: r.status_event ? 'Pagado' : (paid ? 'Pagado' : 'No pagado'),
      };
    });

    return { total, page, pageSize: take, data };
  }

  /** Activar/Desactivar (individual) MEJORADO */
  async setUserEventActivation(params: {
    actorUserId?: number;
    userId: number;
    activate: boolean;
    force?: boolean;
    reason?: string;
    status_event?: boolean; // 👈 NUEVO: parámetro explícito
  }) {
    const { userId, activate, force, status_event } = params;

    const user = await this.prisma.users.findUnique({
      where: { user_id: BigInt(userId) },
      include: {
        type_user: { select: { name_type: true } },
        Payment: {
          select: {
            paymentStatus: true,
            status: true,
            paymentIntentStatus: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (user.status === 'deleted' || user.status === 'suspended') {
      throw new ForbiddenException(
        `No puedes cambiar el estado del evento para un usuario ${user.status}`,
      );
    }

    // 👈 MEJORA: Verificación de pago más robusta
    if (activate && !force) {
      const hasPaid = await this.prisma.payment.count({
        where: {
          userId: BigInt(userId),
          OR: [
            { paymentStatus: { equals: 'paid', mode: 'insensitive' } },
            { status: { equals: 'paid', mode: 'insensitive' } },
            { paymentIntentStatus: { equals: 'succeeded', mode: 'insensitive' } },
          ],
        },
      });
      if (hasPaid === 0) {
        throw new BadRequestException(
          'No puedes activar al usuario: no tiene un pago válido. Usa "force: true" para activación manual.',
        );
      }
    }

    // 👈 CORRECCIÓN: Usar status_event si viene, sino activate
    const finalStatusEvent = typeof status_event === 'boolean' ? status_event : activate;

    const updated = await this.prisma.users.update({
      where: { user_id: BigInt(userId) },
      data: {
        status_event: finalStatusEvent,
        ...(activate ? { status: 'active' as status_user } : {}),
      },
      include: {
        type_user: { select: { name_type: true } },
        Payment: {
          select: {
            paymentStatus: true,
            status: true,
            paymentIntentStatus: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // 👈 MEJORA: Construir respuesta completa como en listUsers
    const lastPay = updated.Payment?.[0];
    const paid = !!lastPay && (
      lastPay.paymentStatus?.toLowerCase?.() === 'paid' ||
      lastPay.status?.toLowerCase?.() === 'paid' ||
      lastPay.paymentIntentStatus?.toLowerCase?.() === 'succeeded'
    );

    return {
      id: Number(updated.user_id),
      name: [updated.name_user, updated.paternal_surname, updated.maternal_surname].filter(Boolean).join(' '),
      email: updated.email,
      status: updated.status,
      eventEnabled: updated.status_event,
      status_event: updated.status_event,
      paymentStatus: updated.status_event ? 'Pagado' : (paid ? 'Pagado' : 'No pagado'),
      message: activate
        ? `Usuario activado ${force ? 'manualmente (sin verificación de pago)' : 'con pago verificado'}`
        : 'Usuario desactivado',
    };
  }

  /** Activar/Desactivar MASIVO MEJORADO */
  async setUsersEventActivationBulk(params: {
    actorUserId?: number;
    ids: number[];
    activate: boolean;
    force?: boolean;
    reason?: string;
    status_event?: boolean; // 👈 NUEVO: parámetro explícito
  }) {
    const { ids, activate, force, status_event } = params;

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('Debes enviar al menos un id');
    }

    // Validación de existencias
    const records = await this.prisma.users.findMany({
      where: { user_id: { in: ids.map(n => BigInt(n)) } },
      select: { user_id: true, status: true },
    });

    if (records.length === 0) {
      throw new NotFoundException('Usuarios no encontrados');
    }

    const blocked = records.filter(r => r.status === 'deleted' || r.status === 'suspended');
    if (blocked.length > 0 && !force) {
      throw new ForbiddenException(
        `No puedes modificar ${blocked.length} usuario(s) con estado eliminado o suspendido`
      );
    }

    // Verificación de pagos para activación
    if (activate && !force) {
      const paid = await this.prisma.payment.findMany({
        where: {
          userId: { in: ids.map(n => BigInt(n)) },
          OR: [
            { paymentStatus: { equals: 'paid', mode: 'insensitive' } },
            { status: { equals: 'paid', mode: 'insensitive' } },
            { paymentIntentStatus: { equals: 'succeeded', mode: 'insensitive' } },
          ],
        },
        select: { userId: true },
        distinct: ['userId'],
      });
      const paidSet = new Set(paid.map(p => Number(p.userId)));
      const withoutPay = ids.filter(id => !paidSet.has(id));
      if (withoutPay.length > 0) {
        throw new BadRequestException(
          `No puedes activar a ${withoutPay.length} usuario(s) sin pago. Usa "force: true" para activación manual.`,
        );
      }
    }

    // 👈 CORRECCIÓN: Usar status_event si viene, sino activate
    const finalStatusEvent = typeof status_event === 'boolean' ? status_event : activate;

    // Actualización masiva
    await this.prisma.users.updateMany({
      where: {
        user_id: { in: ids.map(n => BigInt(n)) },
        NOT: { status: { in: ['deleted', 'suspended'] } },
      },
      data: {
        status_event: finalStatusEvent,
        ...(activate ? { status: 'active' as status_user } : {}),
      },
    });

    // 👈 MEJORA: Devolver información más completa
    const after = await this.prisma.users.findMany({
      where: { user_id: { in: ids.map(n => BigInt(n)) } },
      include: {
        type_user: { select: { name_type: true } },
        Payment: {
          select: {
            paymentStatus: true,
            status: true,
            paymentIntentStatus: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return after.map(user => {
      const lastPay = user.Payment?.[0];
      const paid = !!lastPay && (
        lastPay.paymentStatus?.toLowerCase?.() === 'paid' ||
        lastPay.status?.toLowerCase?.() === 'paid' ||
        lastPay.paymentIntentStatus?.toLowerCase?.() === 'succeeded'
      );

      return {
        id: Number(user.user_id),
        eventEnabled: !!user.status_event,
        status_event: !!user.status_event,
        paymentStatus: user.status_event ? 'Pagado' : (paid ? 'Pagado' : 'No pagado'),
      };
    });
  }
}