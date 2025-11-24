import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '@prisma/prisma.service';
import { Prisma, status_user } from '@prisma/client';

import PDFDocument = require('pdfkit');
import * as QRCode from 'qrcode';
import { join } from 'path';

import {
  buildMultiTermSearch,
  normalizeGrade,
  normalizeGroup,
  splitGradeGroup,
} from '@/common/utils/normalize-academics';

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

  // ============================================================
  // 📌 OPTIONS FOR FILTERS
  // ============================================================
  async getFilterOptions() {
    const [gradesRaw, groupsRaw, types] = await Promise.all([
      this.prisma.users.findMany({
        where: { grade: { not: null }, status: { not: 'deleted' } },
        select: { grade: true },
        distinct: ['grade'],
      }),
      this.prisma.users.findMany({
        where: { group_user: { not: null }, status: { not: 'deleted' } },
        select: { group_user: true },
        distinct: ['group_user'],
      }),
      this.prisma.type_user.findMany({
        select: { type_user_id: true, name_type: true },
      }),
    ]);

    const gradeSet = new Set<string>();
    gradesRaw.forEach((g) => {
      const norm = normalizeGrade(g.grade ?? undefined);
      if (norm) gradeSet.add(norm);
    });

    const grades = Array.from(gradeSet)
      .map(Number)
      .sort((a, b) => a - b)
      .map(String)
      .filter((g) => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].includes(g));

    const groupSet = new Set<string>();
    groupsRaw.forEach((g) => {
      const norm = normalizeGroup(g.group_user ?? undefined);
      if (norm) groupSet.add(norm);
    });

    const groups = Array.from(groupSet).sort((a, b) => a.localeCompare(b, 'es'));

    return {
      grades,
      groups,
      types: types.map((t) => ({
        id: Number(t.type_user_id),
        name: t.name_type,
      })),
      statuses: ['active', 'inactive', 'suspended', 'deleted'],
      eventStatuses: [true, false],
    };
  }

  // ============================================================
  // 📌 PARSE FILTER KEY/VAL
  // ============================================================
  private parseFilterKV(filter?: string) {
    if (!filter || !filter.includes(':')) return {};
    const obj: Record<string, string> = {};

    for (const part of filter
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)) {
      const [k, v] = part.split(':').map((x) => x.trim());
      if (k && v) obj[k.toLowerCase()] = v;
    }
    return obj;
  }

  // ============================================================
  // 📌 LIST USERS
  // ============================================================
  async listUsers({ q, filter, grade, group, page, pageSize }: ListArgs) {
    const effectiveFilter = filter === 'Todos' ? undefined : filter;

    let gradeNorm: string | null = null;
    let groupNorm: string | null = null;

    if (grade) {
      if (grade === '10' || grade.includes('10')) gradeNorm = '10';
      else {
        const split = splitGradeGroup(grade);
        gradeNorm = split.grade ?? null;
        if (!group && split.group) groupNorm = split.group;
      }
    }

    if (group) groupNorm = normalizeGroup(group);

    const terms = (q ?? '').split(/\s+/).filter(Boolean);
    const searchWhere = buildMultiTermSearch(terms);

    const parsed = this.parseFilterKV(effectiveFilter);

    const where: Prisma.usersWhereInput = {
      ...(searchWhere ?? {}),
      ...(gradeNorm ? { grade: gradeNorm } : {}),
      ...(groupNorm ? { group_user: groupNorm } : {}),
    };

    if (effectiveFilter && !effectiveFilter.includes(':')) {
      if (['Estudiante', 'Docente', 'Ponente/Tallerista', 'Externo', 'Admin'].includes(effectiveFilter)) {
        where.type_user = { name_type: { equals: effectiveFilter, mode: 'insensitive' } };
      } else if (['Activo', 'Inactivo', 'Suspendido', 'Eliminado'].includes(effectiveFilter)) {
        const map: Record<string, status_user> = {
          Activo: 'active',
          Inactivo: 'inactive',
          Suspendido: 'suspended',
          Eliminado: 'deleted',
        };
        where.status = map[effectiveFilter];
      } else if (['Pagado', 'No pagado'].includes(effectiveFilter)) {
        where.status_event = effectiveFilter === 'Pagado';
      }
    }

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

    const take = Math.min(Math.max(pageSize, 1), 200);
    const skip = Math.max((page - 1) * take, 0);

    // admin.service.ts  (solo muestro la parte de listUsers)

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
      is_badge_printed: true,      // 👈 NUEVO
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
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.users.count({ where }),
      this.prisma.users.findMany({
        where,
        select,
        skip,
        take,
        orderBy:{ user_id:'desc' }
      })
    ]);

    const data = rows.map(r => {
      const lastPay = r.Payment?.[0];
      const paid = !!lastPay && (
        lastPay.paymentStatus?.toLowerCase() === 'paid' ||
        lastPay.status?.toLowerCase() === 'paid' ||
        lastPay.paymentIntentStatus?.toLowerCase() === 'succeeded'
      );

      return {
        id: Number(r.user_id),
        name: [r.name_user, r.paternal_surname, r.maternal_surname].filter(Boolean).join(' '),
        email: r.email,
        phone: r.phone,
        code: r.matricula ?? String(r.user_id),
        provenance: r.provenance,
        educational_program: r.educational_program,
        grade: normalizeGrade(r.grade),
        group: normalizeGroup(r.group_user),
        type: r.type_user?.name_type ?? 'Externo',
        isActive: r.status === 'active',
        eventEnabled: !!r.status_event,
        status_event: !!r.status_event,
        isBadgePrinted: !!r.is_badge_printed,   // 👈 NUEVO
        paymentStatus: r.status_event ? 'Pagado' : (paid ? 'Pagado' : 'No pagado'),
      };
    });

    return { total, page, pageSize:take, data };

  }

  // ============================================================
  // 📌 ACTIVATION (ONE)
  // (sin cambios relevantes para gafetes)
  // ============================================================
  async setUserEventActivation(params: {
    actorUserId?: number;
    userId: number;
    activate: boolean;
    force?: boolean;
    reason?: string;
    status_event?: boolean;
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

    if (['deleted', 'suspended'].includes(user.status ?? '')) {
      throw new ForbiddenException(`No puedes modificar un usuario ${user.status}`);
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
          'No puedes activar sin un pago válido. Usa force:true si deseas forzar.',
        );
      }
    }

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

    const lastPay = updated.Payment?.[0];
    const paid =
      !!lastPay &&
      (lastPay.paymentStatus?.toLowerCase() === 'paid' ||
        lastPay.status?.toLowerCase() === 'paid' ||
        lastPay.paymentIntentStatus?.toLowerCase() === 'succeeded');

    return {
      id: Number(updated.user_id),
      name: [updated.name_user, updated.paternal_surname, updated.maternal_surname]
        .filter(Boolean)
        .join(' '),
      email: updated.email,
      status: updated.status,
      eventEnabled: updated.status_event,
      status_event: updated.status_event,
      paymentStatus: updated.status_event ? 'Pagado' : paid ? 'Pagado' : 'No pagado',
      message: activate
        ? `Usuario activado ${force ? '(manual)' : '(con pago verificado)'}`
        : 'Usuario desactivado',
    };
  }

  // ============================================================
  // 📌 ACTIVATION (BULK)
  // (igual que ya tenías, sin cambios de lógica de gafetes)
  // ============================================================
  async setUsersEventActivationBulk(params: {
    actorUserId?: number;
    ids: number[];
    activate: boolean;
    force?: boolean;
    reason?: string;
    status_event?: boolean;
  }) {
    const { ids, activate, force, status_event } = params;

    if (!ids.length) throw new BadRequestException('Debes enviar al menos un ID');

    const records = await this.prisma.users.findMany({
      where: { user_id: { in: ids.map((n) => BigInt(n)) } },
      select: { user_id: true, status: true },
    });

    if (records.length === 0) throw new NotFoundException('Usuarios no encontrados');

    const blocked = records.filter((r) => ['deleted', 'suspended'].includes(r.status ?? ''));

    if (blocked.length && !force) {
      throw new ForbiddenException(`Hay ${blocked.length} usuarios suspendidos o eliminados`);
    }

    if (activate && !force) {
      const paid = await this.prisma.payment.findMany({
        where: {
          userId: { in: ids.map((n) => BigInt(n)) },
          OR: [
            { paymentStatus: { equals: 'paid', mode: 'insensitive' } },
            { status: { equals: 'paid', mode: 'insensitive' } },
            { paymentIntentStatus: { equals: 'succeeded', mode: 'insensitive' } },
          ],
        },
        distinct: ['userId'],
        select: { userId: true },
      });

      const paidSet = new Set(paid.map((p) => Number(p.userId)));
      const withoutPay = ids.filter((id) => !paidSet.has(id));

      if (withoutPay.length) {
        throw new BadRequestException(
          `No puedes activar ${withoutPay.length} usuario(s) sin pago. Usa force:true.`,
        );
      }
    }

    const finalStatusEvent = typeof status_event === 'boolean' ? status_event : activate;

    await this.prisma.users.updateMany({
      where: {
        user_id: { in: ids.map((n) => BigInt(n)) },
        NOT: { status: { in: ['deleted', 'suspended'] } },
      },
      data: {
        status_event: finalStatusEvent,
        ...(activate ? { status: 'active' as status_user } : {}),
      },
    });

    const after = await this.prisma.users.findMany({
      where: { user_id: { in: ids.map((n) => BigInt(n)) } },
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

    return after.map((user) => {
      const lastPay = user.Payment?.[0];
      const paid =
        !!lastPay &&
        (lastPay.paymentStatus?.toLowerCase() === 'paid' ||
          lastPay.status?.toLowerCase() === 'paid' ||
          lastPay.paymentIntentStatus?.toLowerCase() === 'succeeded');

      return {
        id: Number(user.user_id),
        eventEnabled: !!user.status_event,
        status_event: !!user.status_event,
        paymentStatus: user.status_event ? 'Pagado' : paid ? 'Pagado' : 'No pagado',
      };
    });
  }

// ============================================================
// 📌 GENERATE BADGES PDF
// ============================================================
async generateBadgesPdf(ids: number[], markPrinted = true): Promise<Buffer> {
  const users = await this.prisma.users.findMany({
    where: { user_id: { in: ids.map((n) => BigInt(n)) } },
    select: {
      user_id: true,
      name_user: true,
      paternal_surname: true,
      maternal_surname: true,
      email: true,
      matricula: true,
      type_user: { select: { name_type: true } },
      grade: true,
      group_user: true,
    },
  });

  if (!users.length) {
    // ÉSTE es el 400 que ves si los ids no matchean
    throw new BadRequestException('No se encontraron usuarios.');
  }

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 0 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err: Error) => reject(err));

    // 👇 NUEVO: mapeo robusto de plantillas por tipo_usuario
    const getTemplatePath = (rawRole?: string | null) => {
      const base = join(process.cwd(), 'public/badges');

      const role = (rawRole || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\\/g, '/')
        .trim();

      // Los nombres posibles que se usan en tu código:
      // Estudiante, Docente, Ponente/Tallerista, Externo, Admin
      if (role.includes('docente')) {
        return join(base, 'teacher.png');
      }
      if (role.includes('ponente') || role.includes('tallerista')) {
        return join(base, 'speaker.png');
      }
      if (role.includes('externo')) {
        return join(base, 'external.png'); // si NO existe, abajo hacemos fallback
      }
      if (role.includes('admin')) {
        return join(base, 'admin.png');    // o crea admin.png; si no, usa student.png
      }
      // default → estudiante
      return join(base, 'student.png');
    };

    // ---- Layout 4 por página (2 columnas x 2 filas) ----
    const pageWidth = doc.page.width;
    const marginX = 20;
    const gapX = 16;
    const badgeWidth = (pageWidth - 2 * marginX - gapX) / 2;

    const originalRatio = 420 / 320;
    const badgeHeight = badgeWidth * originalRatio;

    const marginY = 20;
    const gapY = 20;

    const positions = [
      { x: marginX, y: marginY },
      { x: marginX + badgeWidth + gapX, y: marginY },
      { x: marginX, y: marginY + badgeHeight + gapY },
      { x: marginX + badgeWidth + gapX, y: marginY + badgeHeight + gapY },
    ];

    const scaleX = badgeWidth / 320;
    const scaleY = badgeHeight / 420;

    const textColor = '#001B5E';

    (async () => {
      for (let i = 0; i < users.length; i++) {
        const u = users[i];

        const indexInPage = i % 4;
        if (i > 0 && indexInPage === 0) {
          doc.addPage();
        }

        const pos = positions[indexInPage];
        const roleName = u.type_user?.name_type ?? 'Externo';

        // ---------- Fondo según tipo_usuario ----------
        let templatePath = getTemplatePath(roleName);
        try {
          doc.image(templatePath, pos.x, pos.y, {
            width: badgeWidth,
            height: badgeHeight,
          });
        } catch (e) {
          // Si falta el PNG de ese rol, usamos siempre el de estudiante
          const fallback = join(process.cwd(), 'public/badges/student.png');
          doc.image(fallback, pos.x, pos.y, {
            width: badgeWidth,
            height: badgeHeight,
          });
        }

        // ---------- QR centrado ----------
        const qrDataUrl = await QRCode.toDataURL(u.email || String(u.user_id));
        const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
        const qrSize = 80 * scaleX;
        const qrX = pos.x + (badgeWidth - qrSize) / 2;
        const qrY = pos.y + 125 * scaleY;
        doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

        // ---------- Nombre (una línea, autoshrink) ----------
        const fullName = [u.name_user, u.paternal_surname, u.maternal_surname]
          .filter(Boolean)
          .join(' ');

        doc.fillColor(textColor);
        doc.font('Helvetica-Bold');

        const nameAreaWidth = badgeWidth - 40;
        let nameFontSize = 22 * scaleY;
        if (nameFontSize > 26) nameFontSize = 26;

        doc.fontSize(nameFontSize);
        let nameWidth = doc.widthOfString(fullName);

        while (nameFontSize > 10 && nameWidth > nameAreaWidth) {
          nameFontSize -= 0.5;
          doc.fontSize(nameFontSize);
          nameWidth = doc.widthOfString(fullName);
        }

        const nameY = pos.y + 255 * scaleY;
        doc.text(fullName, pos.x + 20, nameY, {
          width: nameAreaWidth,
          align: 'center',
        });

        // ---------- Matrícula ----------
        const codeY = pos.y + 292 * scaleY;
        const codeFontSize = 12 * scaleY;
        doc.font('Helvetica').fontSize(codeFontSize);
        doc.text(u.matricula ?? String(u.user_id), pos.x, codeY, {
          width: badgeWidth,
          align: 'center',
        });

        // ---------- Tipo visible ----------
        const visibleRole = (roleName || 'Externo').replace(/\\/g, '/');
        const typeY = pos.y + 315 * scaleY;
        const typeFontSize = 11 * scaleY;
        doc.fontSize(typeFontSize);
        doc.text(visibleRole, pos.x, typeY, {
          width: badgeWidth,
          align: 'center',
        });
      }

      doc.end();
    })().catch((err) => {
      try {
        doc.end();
      } catch (_) {}
      reject(err);
    });
  });

  if (markPrinted) {
    await this.prisma.users.updateMany({
      where: { user_id: { in: ids.map((n) => BigInt(n)) } },
      data: { is_badge_printed: true },
    });
  }

  return pdfBuffer;
}

}
