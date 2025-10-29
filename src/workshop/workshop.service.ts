// src/workshop/workshop.service.ts
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { WorkshopResponseDto } from './dto/workshop-response.dto';
import { status_enum } from '@prisma/client';

interface UserInfo {
  user_id: bigint;
  status_event: boolean | null;
  workshop_id: bigint | null;
}

@Injectable()
export class WorkshopService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifica si el usuario tiene pago aprobado
   */
  private async userHasApprovedPayment(userId: bigint): Promise<boolean> {
    try {
      const payment = await this.prisma.payment.findFirst({
        where: {
          userId: userId,
          paymentStatus: 'paid', // Asumiendo que 'paid' es el estado de pago aprobado
          status: 'complete', // Estado de la sesión completada
        },
      });
      return !!payment;
    } catch (error) {
      console.error(`[WorkshopService] Error verificando pago para usuario ${userId}:`, error);
      return false;
    }
  }

  /**
   * Determina el estado de inscripción y propiedades del botón
   */
  private determineEnrollmentStatus(
    isAuthenticated: boolean,
    hasPayment: boolean,
    isEnrolled: boolean,
    availableSpots: number,
    userWorkshopId: number | null,
    currentWorkshopId: number
  ): {
    enrollment_status: string;
    can_enroll: boolean;
    button_text: string;
    button_disabled: boolean;
    button_type: string;
  } {
    // Estado 1: Usuario no autenticado
    if (!isAuthenticated) {
      return {
        enrollment_status: 'not_authenticated',
        can_enroll: false,
        button_text: 'Inscribirse',
        button_disabled: true,
        button_type: 'default'
      };
    }

    // Estado 4: Usuario ya inscrito en ESTE taller
    if (isEnrolled || userWorkshopId === currentWorkshopId) {
      return {
        enrollment_status: 'already_enrolled',
        can_enroll: false,
        button_text: 'Ya inscrito',
        button_disabled: true,
        button_type: 'success'
      };
    }

    // Estado 2: Usuario autenticado sin pago
    if (!hasPayment) {
      return {
        enrollment_status: 'needs_payment',
        can_enroll: false,
        button_text: 'Completar Pago',
        button_disabled: false,
        button_type: 'warning'
      };
    }

    // Estado 3: Usuario autenticado con pago y hay cupos
    if (availableSpots > 0) {
      return {
        enrollment_status: 'can_enroll',
        can_enroll: true,
        button_text: 'Inscribirse',
        button_disabled: false,
        button_type: 'default'
      };
    }

    // Usuario con pago pero sin cupos
    return {
      enrollment_status: 'no_spots',
      can_enroll: false,
      button_text: 'Sin Cupos',
      button_disabled: true,
      button_type: 'danger'
    };
  }

  /**
   * Obtiene todos los talleres activos con información del instructor
   */
  async getAllWorkshops(userId?: number): Promise<WorkshopResponseDto[]> {
    try {
      console.log(`🔍 [WorkshopService] Obteniendo talleres para usuario: ${userId || 'No autenticado'}`);

      const workshops = await this.prisma.workshop.findMany({
        where: {
          status: 'active',
        },
        include: {
          users_workshop_instructor_user_idTousers: {
            select: {
              user_id: true,
              name_user: true,
              paternal_surname: true,
              maternal_surname: true,
            },
          },
          users_users_workshop_idToworkshop: userId ? {
            where: {
              user_id: BigInt(userId)
            },
            select: {
              user_id: true
            }
          } : false,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      console.log(`📊 [WorkshopService] Encontrados ${workshops.length} talleres activos`);

      // Obtener información del usuario si está autenticado
      let userInfo: UserInfo | null = null;
      let hasPayment = false;

      if (userId) {
        userInfo = await this.prisma.users.findUnique({
          where: { user_id: BigInt(userId) },
          select: {
            user_id: true,
            status_event: true,
            workshop_id: true,
          },
        });

        // Verificar si el usuario tiene pago aprobado
        if (userInfo) {
          hasPayment = await this.userHasApprovedPayment(BigInt(userId));
          console.log(`💰 [WorkshopService] Usuario ${userId} tiene pago: ${hasPayment}`);
        }
      }

      // Transformar los datos para el response
      const transformedWorkshops = workshops.map(workshop => {
        const isUserEnrolled = userId ? 
          workshop.users_users_workshop_idToworkshop?.length > 0 : false;
        
        const userWorkshopId = userInfo?.workshop_id ? Number(userInfo.workshop_id) : null;
        const currentWorkshopId = Number(workshop.workshop_id);
        
        const spotsMax = workshop.spots_max || 0;
        const spotsOccupied = workshop.spots_occupied || 0;
        const availableSpots = spotsMax > 0 ? spotsMax - spotsOccupied : 0;

        // Determinar el estado de inscripción
        const enrollmentInfo = this.determineEnrollmentStatus(
          !!userId,
          hasPayment,
          isUserEnrolled,
          availableSpots,
          userWorkshopId,
          currentWorkshopId
        );

        return {
          workshop_id: currentWorkshopId,
          name_workshop: workshop.name_workshop || '',
          descript: workshop.descript || '',
          spots_max: spotsMax,
          spots_occupied: spotsOccupied,
          available_spots: availableSpots,
          building: workshop.building || '',
          classroom: workshop.classroom || '',
          status: workshop.status || status_enum.active,
          instructor_user_id: workshop.instructor_user_id ? Number(workshop.instructor_user_id) : undefined,
          created_at: workshop.created_at || undefined,
          updated_at: workshop.updated_at || undefined,
          instructor_name: workshop.users_workshop_instructor_user_idTousers 
            ? `${workshop.users_workshop_instructor_user_idTousers.name_user || ''} ${workshop.users_workshop_instructor_user_idTousers.paternal_surname || ''} ${workshop.users_workshop_instructor_user_idTousers.maternal_surname || ''}`.trim()
            : '',
          is_user_enrolled: isUserEnrolled,
          can_enroll: enrollmentInfo.can_enroll,
          enrollment_status: enrollmentInfo.enrollment_status,
          button_text: enrollmentInfo.button_text,
          button_disabled: enrollmentInfo.button_disabled,
          button_type: enrollmentInfo.button_type,
        };
      });

      console.log(`✅ [WorkshopService] Transformados ${transformedWorkshops.length} talleres`);
      return transformedWorkshops;

    } catch (error) {
      console.error('[WorkshopService] Error obteniendo talleres:', error);
      
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Manejo de errores de base de datos
      if (error.code === 'P1001' || error.code === 'P1017') {
        throw new ServiceUnavailableException(
          'No es posible conectar a la base de datos en este momento. Intenta nuevamente más tarde.'
        );
      }

      throw new InternalServerErrorException('Error al obtener los talleres');
    }
  }

  /**
   * Obtiene un taller específico por ID
   */
  async getWorkshopById(id: number, userId?: number): Promise<WorkshopResponseDto> {
    try {
      console.log(`🔍 [WorkshopService] Obteniendo taller ${id} para usuario: ${userId || 'No autenticado'}`);

      const workshop = await this.prisma.workshop.findFirst({
        where: {
          workshop_id: BigInt(id),
          status: 'active',
        },
        include: {
          users_workshop_instructor_user_idTousers: {
            select: {
              user_id: true,
              name_user: true,
              paternal_surname: true,
              maternal_surname: true,
            },
          },
          users_users_workshop_idToworkshop: userId ? {
            where: {
              user_id: BigInt(userId)
            },
            select: {
              user_id: true
            }
          } : false,
          schedule: {
            select: {
              schedule_id: true,
              name_conference: true,
              day_week: true,
              assigned_date: true,
              start_time: true,
              end_time: true,
            },
          },
        },
      });

      if (!workshop) {
        throw new NotFoundException(`Taller con ID ${id} no encontrado`);
      }

      // Obtener información del usuario si está autenticado
      let userInfo: UserInfo | null = null;
      let hasPayment = false;

      if (userId) {
        userInfo = await this.prisma.users.findUnique({
          where: { user_id: BigInt(userId) },
          select: {
            user_id: true,
            status_event: true,
            workshop_id: true,
          },
        });

        // Verificar si el usuario tiene pago aprobado
        if (userInfo) {
          hasPayment = await this.userHasApprovedPayment(BigInt(userId));
        }
      }

      const isUserEnrolled = userId ? 
        workshop.users_users_workshop_idToworkshop?.length > 0 : false;
      
      const userWorkshopId = userInfo?.workshop_id ? Number(userInfo.workshop_id) : null;
      const currentWorkshopId = Number(workshop.workshop_id);
      
      const spotsMax = workshop.spots_max || 0;
      const spotsOccupied = workshop.spots_occupied || 0;
      const availableSpots = spotsMax > 0 ? spotsMax - spotsOccupied : 0;

      // Determinar el estado de inscripción
      const enrollmentInfo = this.determineEnrollmentStatus(
        !!userId,
        hasPayment,
        isUserEnrolled,
        availableSpots,
        userWorkshopId,
        currentWorkshopId
      );

      return {
        workshop_id: currentWorkshopId,
        name_workshop: workshop.name_workshop || '',
        descript: workshop.descript || '',
        spots_max: spotsMax,
        spots_occupied: spotsOccupied,
        available_spots: availableSpots,
        building: workshop.building || '',
        classroom: workshop.classroom || '',
        status: workshop.status || status_enum.active,
        instructor_user_id: workshop.instructor_user_id ? Number(workshop.instructor_user_id) : undefined,
        created_at: workshop.created_at || undefined,
        updated_at: workshop.updated_at || undefined,
        instructor_name: workshop.users_workshop_instructor_user_idTousers 
          ? `${workshop.users_workshop_instructor_user_idTousers.name_user || ''} ${workshop.users_workshop_instructor_user_idTousers.paternal_surname || ''} ${workshop.users_workshop_instructor_user_idTousers.maternal_surname || ''}`.trim()
          : '',
        is_user_enrolled: isUserEnrolled,
        can_enroll: enrollmentInfo.can_enroll,
        enrollment_status: enrollmentInfo.enrollment_status,
        button_text: enrollmentInfo.button_text,
        button_disabled: enrollmentInfo.button_disabled,
        button_type: enrollmentInfo.button_type,
      };
    } catch (error) {
      console.error(`[WorkshopService] Error obteniendo taller ID ${id}:`, error);
      
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error.code === 'P1001' || error.code === 'P1017') {
        throw new ServiceUnavailableException(
          'No es posible conectar a la base de datos en este momento.'
        );
      }

      throw new InternalServerErrorException('Error al obtener el taller');
    }
  }

  /**
   * Obtiene talleres con disponibilidad
   */
  async getAvailableWorkshops(userId?: number): Promise<WorkshopResponseDto[]> {
    try {
      console.log(`🔍 [WorkshopService] Obteniendo talleres disponibles para usuario: ${userId || 'No autenticado'}`);

      const workshops = await this.prisma.workshop.findMany({
        where: {
          status: 'active',
          OR: [
            {
              spots_max: {
                gt: this.prisma.workshop.fields.spots_occupied,
              },
            },
            {
              spots_max: null,
            },
            {
              spots_max: 0,
            },
          ],
        },
        include: {
          users_workshop_instructor_user_idTousers: {
            select: {
              user_id: true,
              name_user: true,
              paternal_surname: true,
              maternal_surname: true,
            },
          },
          users_users_workshop_idToworkshop: userId ? {
            where: {
              user_id: BigInt(userId)
            },
            select: {
              user_id: true
            }
          } : false,
        },
        orderBy: {
          name_workshop: 'asc',
        },
      });

      console.log(`📊 [WorkshopService] Encontrados ${workshops.length} talleres disponibles`);

      // Obtener información del usuario si está autenticado
      let userInfo: UserInfo | null = null;
      let hasPayment = false;

      if (userId) {
        userInfo = await this.prisma.users.findUnique({
          where: { user_id: BigInt(userId) },
          select: {
            user_id: true,
            status_event: true,
            workshop_id: true,
          },
        });

        // Verificar si el usuario tiene pago aprobado
        if (userInfo) {
          hasPayment = await this.userHasApprovedPayment(BigInt(userId));
        }
      }

      return workshops.map(workshop => {
        const isUserEnrolled = userId ? 
          workshop.users_users_workshop_idToworkshop?.length > 0 : false;
        
        const userWorkshopId = userInfo?.workshop_id ? Number(userInfo.workshop_id) : null;
        const currentWorkshopId = Number(workshop.workshop_id);
        
        const spotsMax = workshop.spots_max || 0;
        const spotsOccupied = workshop.spots_occupied || 0;
        const availableSpots = spotsMax > 0 ? spotsMax - spotsOccupied : 0;

        // Determinar el estado de inscripción
        const enrollmentInfo = this.determineEnrollmentStatus(
          !!userId,
          hasPayment,
          isUserEnrolled,
          availableSpots,
          userWorkshopId,
          currentWorkshopId
        );

        return {
          workshop_id: currentWorkshopId,
          name_workshop: workshop.name_workshop || '',
          descript: workshop.descript || '',
          spots_max: spotsMax,
          spots_occupied: spotsOccupied,
          available_spots: availableSpots,
          building: workshop.building || '',
          classroom: workshop.classroom || '',
          status: workshop.status || status_enum.active,
          instructor_user_id: workshop.instructor_user_id ? Number(workshop.instructor_user_id) : undefined,
          created_at: workshop.created_at || undefined,
          updated_at: workshop.updated_at || undefined,
          instructor_name: workshop.users_workshop_instructor_user_idTousers 
            ? `${workshop.users_workshop_instructor_user_idTousers.name_user || ''} ${workshop.users_workshop_instructor_user_idTousers.paternal_surname || ''} ${workshop.users_workshop_instructor_user_idTousers.maternal_surname || ''}`.trim()
            : '',
          is_user_enrolled: isUserEnrolled,
          can_enroll: enrollmentInfo.can_enroll,
          enrollment_status: enrollmentInfo.enrollment_status,
          button_text: enrollmentInfo.button_text,
          button_disabled: enrollmentInfo.button_disabled,
          button_type: enrollmentInfo.button_type,
        };
      });
    } catch (error) {
      console.error('[WorkshopService] Error obteniendo talleres disponibles:', error);
      
      if (error.code === 'P1001' || error.code === 'P1017') {
        throw new ServiceUnavailableException(
          'No es posible conectar a la base de datos en este momento.'
        );
      }

      throw new InternalServerErrorException('Error al obtener los talleres disponibles');
    }
  }
}