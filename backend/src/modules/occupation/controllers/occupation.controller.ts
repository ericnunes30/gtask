import { Controller, Get, Post, Body, Param, Put, Delete, ParseIntPipe } from '@nestjs/common';
import { OccupationService } from '../services/occupation.service';
import { CreateOccupationDto } from '../dto/create-occupation.dto';
import { UpdateOccupationDto } from '../dto/update-occupation.dto';

@Controller('occupations')
export class OccupationController {
  constructor(private readonly occupationService: OccupationService) {}

  @Post()
  create(@Body() createOccupationDto: CreateOccupationDto) {
    return this.occupationService.create(createOccupationDto);
  }

  @Get()
  findAll() {
    return this.occupationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.occupationService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateOccupationDto: UpdateOccupationDto) {
    return this.occupationService.update(+id, updateOccupationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.occupationService.remove(+id);
  }

  @Post(':id/users')
  addUserToOccupation(@Param('id', ParseIntPipe) occupationId: number, @Body('userId', ParseIntPipe) userId: number) {
    return this.occupationService.addUserToOccupation(occupationId, userId);
  }

  @Delete(':id/users/:userId')
  removeUserFromOccupation(@Param('id', ParseIntPipe) occupationId: number, @Param('userId', ParseIntPipe) userId: number) {
    return this.occupationService.removeUserFromOccupation(occupationId, userId);
  }
}