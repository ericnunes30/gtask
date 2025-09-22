import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request as NestRequest, Logger } from '@nestjs/common';
import { RecurringTaskService } from '../services/recurring-task.service';
import { CreateRecurringTaskDto } from '../dto/create-recurring-task.dto';
import { UpdateRecurringTaskDto } from '../dto/update-recurring-task.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@Controller('recurring-tasks')
@UseGuards(JwtAuthGuard)
export class RecurringTaskController {
  constructor(private readonly recurringTaskService: RecurringTaskService) {}

  @Get()
  async findAll() {
    return this.recurringTaskService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.recurringTaskService.findOne(+id);
  }

  @Post()
  async create(@Body() createRecurringTaskDto: CreateRecurringTaskDto, @NestRequest() req) {
    Logger.log(`Received createRecurringTaskDto: ${JSON.stringify(createRecurringTaskDto)}`, 'RecurringTaskController');
    return this.recurringTaskService.create(createRecurringTaskDto, req.user.id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateRecurringTaskDto: UpdateRecurringTaskDto,
  ) {
    return this.recurringTaskService.update(+id, updateRecurringTaskDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.recurringTaskService.remove(+id);
  }
}
