import { PartialType } from '@nestjs/swagger';
import { CreateWorkshopScheduleDto } from './create.workshop.dto';

export class UpdateWorkshopScheduleDto extends PartialType(CreateWorkshopScheduleDto) {}
