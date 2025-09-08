import { PartialType } from '@nestjs/mapped-types';
import { CreateRegisterDto } from './create-register.dto';

export class UpdateLoginDto extends PartialType(CreateRegisterDto) {}
