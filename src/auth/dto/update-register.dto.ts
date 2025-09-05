import { PartialType } from '@nestjs/mapped-types';
import { CreateAuthDto } from './create-register.dto';

export class UpdateAuthDto extends PartialType(CreateAuthDto) {}
