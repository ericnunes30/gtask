import { Controller, Get, Post, Req } from '@nestjs/common';

@Controller("task")
export class TaskController{
    @Get()
    findAll(@Req() request: Request): string {
    return 'This action returns all cats';
  }
}