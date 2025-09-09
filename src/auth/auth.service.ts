// src/auth/auth.service.ts
import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { CreateUserDto } from '@/auth/dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client'; // Importa Prisma en lugar del tipo específico

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async createrUserSrv(dto: CreateUserDto) {
    // 1. Normalizar email
    const email = dto.email.toLowerCase().trim();

    // 2. Verificar duplicados - CORRECCIÓN AQUÍ
    const exists = await this.prisma.users.findUnique({
      where: { email } // TypeScript inferirá automáticamente el tipo correcto
    });
    
    if (exists) {
      throw new ConflictException('El correo ya está registrado');
    }

    // 3. Hashear contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    try {
      // 4. Crear usuario
      const user = await this.prisma.users.create({
        data: {
          name_user: dto.name,
          paternal_surname: dto.paternal_surname,
          maternal_surname: dto.maternal_surname,
          phone: dto.phone,
          emergency_phone: dto.phone_emergency,
          email,
          password_user: hashedPassword,
          provenance: dto.university,
          educational_program: dto.educational_program,
          grade: dto.grade,
          group_user: dto.group,
        },
        select: {
          user_id: true,
          name_user: true,
          paternal_surname: true,
          maternal_surname: true,
          phone: true,
          emergency_phone: true,
          email: true,
          provenance: true,
          educational_program: true,
          grade: true,
          group_user: true,
        },
      });

      // 5. Devolver sin datos sensibles
      return {
        message: 'Usuario creado exitosamente',
        user,
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Error al crear el usuario');
    }
  }

  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  /* update(id: number, updateAuthDto: UpdateRegisterDto) {
    return `This action updates a #${id} auth`;
  } */

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}
