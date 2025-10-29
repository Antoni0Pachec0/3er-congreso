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
  constructor(private prisma: PrismaService) {}

  /** Devuelve opciones de filtros normalizadas y deduplicadas */
  async getFilterOptions() {
    const [gradesRaw, groupsRaw, types] = await Promise.all([
      this.prisma.users.findMany({
        where: { grade: { not: null } },
        select: { grade: true },
      }),
      this.prisma.users.findMany({
        where: { group_user: { not: null } },
        select: { group_user: true },
      }),
      this.prisma.type_user.findMany({ select: { type_user_id: true, name_type: true } }),
    ]);

    const gradeSet = new Set<string>();
    for (const g of gradesRaw) {
      const norm = normalizeGrade(g.grade ?? undefined);
      if (norm) gradeSet.add(norm);
    }
    const grades = Array.from(gradeSet).map(Number).sort((a, b) => a - b).map(String);

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

  /** Parser opcional de filtro combinado "k:v,k2:v2" */
  private parseFilterKV(filter?: string) {
    if (!filter) return {};
    const obj: Record<string, string> = {};
    for (const part of filter.split(',').map(s => s.trim()).filter(Boolean)) {
      const [k, v] = part.split(':').map(x => x?.trim());
      if (k && v) obj[k.toLowerCase()] = v;
    }
    return obj;
  }

  async listUsers({ q, filter, grade, group, page, pageSize }: ListArgs) {
    // ——— Normalización grado/grupo
    let gradeNorm: string | null = null;
    let groupNorm: string | null = null;

    if (grade) {
      const split = splitGradeGroup(grade); // "1A", "2° b", "10C", etc.
      gradeNorm = split.grade ?? null;
      if (!group && split.group) groupNorm = split.group;
    }
    if (group && !groupNorm) groupNorm = normalizeGroup(group);

    // ——— Búsqueda multi-término
    const terms = (q ?? '').split(/\s+/).filter(Boolean);
    const searchWhere = buildMultiTermSearch(terms);

    // ——— Filtros
    const parsed = this.parseFilterKV(filter);
    const where: Prisma.usersWhereInput = {
      ...(searchWhere || {}),
      ...(gradeNorm ? { grade: { equals: gradeNorm } } : {}),
      ...(groupNorm ? { group_user: { equals: groupNorm } } : {}),
    };

    // Compatibilidad con etiquetas “simples”
    if (filter) {
      // Tipos por nombre visible
      if (['Estudiante', 'Docente', 'Ponente/Tallerista', 'Externo', 'Admin'].includes(filter)) {
        where.type_user = { name_type: { equals: filter, mode: 'insensitive' } };
      }
      // Estado visible
      if (['Activo', 'Inactivo', 'Suspendido', 'Eliminado'].includes(filter)) {
        const map: Record<string, status_user> = {
          'Activo': 'active',
          'Inactivo': 'inactive',
          'Suspendido': 'suspended',
          'Eliminado': 'deleted',
        };
        where.status = map[filter];
      }
      // Pagado / No pagado (por tabla Payment)
      if (['Pagado', 'No pagado'].includes(filter)) {
        const paidOR = [
          { paymentStatus: { equals: 'paid', mode: 'insensitive' as const } },
          { status: { equals: 'paid', mode: 'insensitive' as const } },
          { paymentIntentStatus: { equals: 'succeeded', mode: 'insensitive' as const } },
        ];
        (where as any).Payment = filter === 'Pagado'
          ? { some: { OR: paidOR } }
          : { none: { OR: paidOR } };
      }
    }

    // Pares clave:valor (opcionales)
    if (parsed.status) {
      const v = parsed.status.toLowerCase();
      if (['active', 'inactive', 'suspended', 'deleted'].includes(v)) {
        where.status = v as status_user;
      }
    }
    if (parsed.type) {
      where.type_user = { name_type: { equals: parsed.type, mode: 'insensitive' } };
    }
    if (parsed.event === 'true') (where as any).status_event = true;
    if (parsed.event === 'false') (where as any).status_event = false;

    // ——— Paginado + selección
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
        // la UI ahora usa status_event para “Pago”
        paymentStatus: (r.status_event ? 'Pagado' : (paid ? 'Pagado' : 'No pagado')),
      };
    });

    return { total, page, pageSize: take, data };
  }

  /** Activar/Desactivar (individual) — también sincroniza status_event */
  async setUserEventActivation(params: {
    actorUserId?: number;
    userId: number;
    activate: boolean;
    force?: boolean;
    reason?: string;
  }) {
    const { userId, activate, force } = params;

    const user = await this.prisma.users.findUnique({
      where: { user_id: BigInt(userId) },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (user.status === 'deleted' || user.status === 'suspended') {
      throw new ForbiddenException(
        `No puedes cambiar el estado del evento para un usuario ${user.status}`,
      );
    }

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

    const updated = await this.prisma.users.update({
      where: { user_id: BigInt(userId) },
      data: {
        status_event: activate,                                // ← sincroniza “Pago”
        ...(activate ? { status: 'active' as status_user } : {}),
      },
      select: { user_id: true, email: true, status: true, status_event: true },
    });

    return {
      id: Number(updated.user_id),
      email: updated.email,
      status: updated.status,
      eventEnabled: updated.status_event,
      status_event: updated.status_event,                      // ← por claridad para el FE
      message: activate
        ? `Usuario activado ${force ? 'manualmente (sin verificación de pago)' : 'con pago verificado'}`
        : 'Usuario desactivado',
    };
  }

  /** Activar/Desactivar MASIVO (para nueva ruta bulk) */
  async setUsersEventActivationBulk(params: {
    actorUserId?: number;
    ids: number[];
    activate: boolean;
    force?: boolean;
    reason?: string;
  }) {
    const { ids, activate, force } = params;

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('Debes enviar al menos un id');
    }

    // Validación mínima de existencias / estados no permitidos
    const records = await this.prisma.users.findMany({
      where: { user_id: { in: ids.map(n => BigInt(n)) } },
      select: { user_id: true, status: true },
    });

    if (records.length === 0) {
      throw new NotFoundException('Usuarios no encontrados');
    }

    const blocked = records.filter(r => r.status === 'deleted' || r.status === 'suspended');
    if (blocked.length > 0) {
      // Puedes optar por omitirlos en lugar de bloquear toda la operación.
      // Aquí los omitimos y continuamos con el resto.
    }

    // Si NO es force y estamos activando, verifica pagos (a nivel masivo).
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

    // Actualiza TODOS los usuarios válidos
    await this.prisma.users.updateMany({
      where: {
        user_id: { in: ids.map(n => BigInt(n)) },
        NOT: { status: { in: ['deleted', 'suspended'] } },
      },
      data: {
        status_event: activate,
        ...(activate ? { status: 'active' as status_user } : {}),
      },
    });

    // Devuelve el estado resultante de cada id
    const after = await this.prisma.users.findMany({
      where: { user_id: { in: ids.map(n => BigInt(n)) } },
      select: { user_id: true, status_event: true },
    });

    // Formato para el FE
    return after.map(r => ({
      id: Number(r.user_id),
      eventEnabled: !!r.status_event,
      status_event: !!r.status_event,
    }));
  }
}
