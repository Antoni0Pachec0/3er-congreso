import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';

type ListArgs = { q?: string; filter?: string; page: number; pageSize: number; };

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async listUsers({ q, filter, page, pageSize }: ListArgs) {
    const where: any = {};

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
          status: true,          // active/inactive/suspended/deleted
          status_event: true,    // boolean
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
      if (hasPaid === 0) throw new BadRequestException('No puedes activar al usuario: no tiene un pago válido');
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

      // Sugerencia: tabla admin_action_log (opcional)
      // await tx.admin_action_log.create({
      //   data: {
      //     actor_user_id: params.actorUserId ? BigInt(params.actorUserId) : null,
      //     target_user_id: BigInt(userId),
      //     action: 'SET_EVENT_STATUS',
      //     payload: { activate, force: !!force, reason: reason ?? null },
      //   },
      // });

      return updated;
    });

    return {
      id: Number(result.user_id),
      email: result.email,
      status: result.status,
      eventEnabled: result.status_event,
    };
  }
}
