// src/admin/admin.service.ts
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';

type ListArgs = { 
  q?: string; 
  filter?: string; 
  grade?: string;
  group?: string;
  page: number; 
  pageSize: number; 
};

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // Nuevo método para obtener opciones de filtro dinámicas
  async getFilterOptions() {
    const [grades, groups] = await Promise.all([
      // Obtener grados únicos (solo 2 caracteres)
      this.prisma.users.findMany({
        where: {
          grade: { not: null },
        },
        select: { grade: true },
        distinct: ['grade'],
      }),
      // Obtener grupos únicos (solo 1 carácter)
      this.prisma.users.findMany({
        where: {
          group_user: { not: null },
        },
        select: { group_user: true },
        distinct: ['group_user'],
      }),
    ]);

    // Usar type assertion para evitar errores TypeScript
    const gradeValues = grades
      .map(g => g.grade)
      .filter((grade): grade is string => grade !== null && grade !== undefined)
      .sort((a, b) => a.localeCompare(b));

    const groupValues = groups
      .map(g => g.group_user)
      .filter((group): group is string => group !== null && group !== undefined)
      .sort((a, b) => a.localeCompare(b));

    return {
      grades: gradeValues,
      groups: groupValues,
    };
  }

  async listUsers({ q, filter, grade, group, page, pageSize }: ListArgs) {
    const where: any = {};

    // Filtro de búsqueda general
    if (q?.trim()) {
      const contains = q.trim();
      where.OR = [
        { name_user: { contains, mode: 'insensitive' } },
        { paternal_surname: { contains, mode: 'insensitive' } },
        { maternal_surname: { contains, mode: 'insensitive' } },
        { email: { contains, mode: 'insensitive' } },
        { matricula: { contains, mode: 'insensitive' } },
      ];
    }

    // Filtro por tipo de usuario y estado
    if (filter && filter !== 'Todos') {
      if (['Estudiante','Docente','Ponente/Tallerista','Externo','Admin'].includes(filter)) {
        where.type_user = { name_type: filter };
      }
      if (['Activo','Inactivo'].includes(filter)) {
        where.status = filter === 'Activo' ? 'active' : 'inactive';
      }
      if (['Pagado','No pagado'].includes(filter)) {
        where.Payment = {
          some: filter === 'Pagado'
            ? {
                OR: [
                  { paymentStatus: { equals: 'paid', mode: 'insensitive' } },
                  { status: { equals: 'paid', mode: 'insensitive' } },
                  { paymentIntentStatus: { equals: 'succeeded', mode: 'insensitive' } },
                ],
              }
            : {
                none: {
                  OR: [
                    { paymentStatus: { equals: 'paid', mode: 'insensitive' } },
                    { status: { equals: 'paid', mode: 'insensitive' } },
                    { paymentIntentStatus: { equals: 'succeeded', mode: 'insensitive' } },
                  ],
                },
              },
        };
      }
    }

    // Filtro por grado (case-insensitive, máximo 2 caracteres)
    if (grade?.trim()) {
      const cleanGrade = grade.trim().toUpperCase().substring(0, 2);
      where.grade = { equals: cleanGrade, mode: 'insensitive' };
    }

    // Filtro por grupo (case-insensitive, máximo 1 carácter)
    if (group?.trim()) {
      const cleanGroup = group.trim().toUpperCase().substring(0, 1);
      where.group_user = { equals: cleanGroup, mode: 'insensitive' };
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.users.count({ where }),
      this.prisma.users.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { user_id: 'desc' },
        select: {
          user_id: true,
          name_user: true,
          paternal_surname: true,
          maternal_surname: true,
          email: true,
          matricula: true,
          grade: true,
          group_user: true,
          status: true,
          status_event: true,
          type_user: { select: { name_type: true } },
          Payment: {
            select: { paymentStatus: true, status: true, paymentIntentStatus: true, createdAt: true },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
    ]);

    const data = rows.map(r => {
      const paid = !!r.Payment?.[0] && (
        (r.Payment[0].paymentStatus?.toLowerCase?.() === 'paid') ||
        (r.Payment[0].status?.toLowerCase?.() === 'paid') ||
        (r.Payment[0].paymentIntentStatus?.toLowerCase?.() === 'succeeded')
      );
      return {
        id: Number(r.user_id),
        name: [r.name_user, r.paternal_surname, r.maternal_surname].filter(Boolean).join(' '),
        email: r.email,
        code: r.matricula ?? String(r.user_id),
        grade: r.grade,
        group: r.group_user,
        type: r.type_user?.name_type ?? 'Externo',
        isActive: r.status === 'active',
        eventEnabled: !!r.status_event,
        paymentStatus: paid ? 'Pagado' : 'No pagado',
      };
    });

    return { total, page, pageSize, data };
  }

  async setUserEventActivation(params: { actorUserId?: number; userId: number; activate: boolean; force?: boolean; reason?: string; }) {
    const { userId, activate, force, reason } = params;

    const user = await this.prisma.users.findUnique({ where: { user_id: BigInt(userId) } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (user.status === 'deleted' || user.status === 'suspended') {
      throw new ForbiddenException(`No puedes cambiar el estado del evento para un usuario ${user.status}`);
    }

    // SOLUCIÓN: Permitir activación manual sin verificación de pago cuando se usa force=true
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
          'No puedes activar al usuario: no tiene un pago válido. ' +
          'Usa "force: true" para activación manual.'
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.users.update({
        where: { user_id: BigInt(userId) },
        data: {
          status_event: activate,
          ...(activate ? { status: 'active' } : {}),
        },
        select: { user_id: true, email: true, status: true, status_event: true },
      });

      return updated;
    });

    return {
      id: Number(result.user_id),
      email: result.email,
      status: result.status,
      eventEnabled: result.status_event,
      message: activate 
        ? `Usuario activado ${force ? 'manualmente (sin verificación de pago)' : 'con pago verificado'}`
        : 'Usuario desactivado',
    };
  }
}