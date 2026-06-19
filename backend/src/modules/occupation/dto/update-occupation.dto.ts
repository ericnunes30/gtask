import { PartialType } from '@nestjs/mapped-types';
import { CreateOccupationDto } from './create-occupation.dto';

export class UpdateOccupationDto extends PartialType(CreateOccupationDto) {}
