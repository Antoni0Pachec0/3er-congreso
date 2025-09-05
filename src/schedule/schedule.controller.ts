import { 
  Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';

// DTOs of events
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ScheduleService } from './schedule.service';

// DTOs oif workshops
import { CreateWorkshopScheduleDto } from './dto/create.workshop.dto';
import { UpdateWorkshopScheduleDto } from './dto/update.worshop.schedule.dto';

@ApiTags('Schedule & Workshop')
@Controller()
export class ScheduleController {
  constructor(
    private readonly scheduleService: ScheduleService
  ) {}


  //  events SECTION
 
  @Post('schedule')
  @ApiOperation({ summary: 'Crear un nuevo evento' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Evento creado exitosamente' })
  @ApiBody({ type: CreateScheduleDto })
  @HttpCode(HttpStatus.CREATED)
  createEvent(@Body() createScheduleDto: CreateScheduleDto) {
    return this.scheduleService.create(createScheduleDto);
  }

  @Get('schedule')
  @ApiOperation({ summary: 'Listar todos los eventos' })
  findAllEvents() {
    return this.scheduleService.findAll();
  }

  @Get('schedule/:id')
  @ApiOperation({ summary: 'Obtener un evento por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del evento' })
  findOneEvent(@Param('id') id: string) {
    return this.scheduleService.findOne(+id);
  }

  @Patch('schedule/:id')
  @ApiOperation({ summary: 'Actualizar un evento por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del evento' })
  updateEvent(@Param('id') id: string, @Body() updateScheduleDto: UpdateScheduleDto) {
    return this.scheduleService.update(+id, updateScheduleDto);
  }

  @Delete('schedule/:id')
  @ApiOperation({ summary: 'Eliminar un evento por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del evento' })
  removeEvent(@Param('id') id: string) {
    return this.scheduleService.remove(+id);
  }

 
  // WORKSHOPS SECTION
 
  @Post('workshop-schedule')
  @ApiOperation({ summary: 'Crear un nuevo taller' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Taller creado exitosamente' })
  @ApiBody({ type: CreateWorkshopScheduleDto })
  @HttpCode(HttpStatus.CREATED)


  createWorkshop(@Body() createWorkshopScheduleDto: ScheduleService) {
    return this.scheduleService.create(createWorkshopScheduleDto);
  }

  @Get('workshop-schedule')
  @ApiOperation({ summary: 'Listar todos los talleres' })
  findAllWorkshops() {
    return this.scheduleService.findAll();
  }

  @Get('workshop-schedule/:id')
  @ApiOperation({ summary: 'Obtener un taller por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del taller' })
  findOneWorkshop(@Param('id') id: string) {
    return this.scheduleService.findOne(+id);
  }

  @Patch('workshop-schedule/:id')
  @ApiOperation({ summary: 'Actualizar un taller por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del taller' })
  updateWorkshop(@Param('id') id: string, @Body() updateWorkshopScheduleDto: UpdateWorkshopScheduleDto) {
    return this.scheduleService.update(+id, updateWorkshopScheduleDto);
  }

  @Delete('workshop-schedule/:id')
  @ApiOperation({ summary: 'Eliminar un taller por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del taller' })
  removeWorkshop(@Param('id') id: string) {
    return this.scheduleService.remove(+id);
  }
}
