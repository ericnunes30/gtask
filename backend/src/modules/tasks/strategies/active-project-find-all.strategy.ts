import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity';
import { TaskFindAllStrategy } from './task-find-all.strategy';

@Injectable()
export class ActiveProjectFindAllStrategy implements TaskFindAllStrategy {
  private readonly logger = new Logger(ActiveProjectFindAllStrategy.name);

  canHandle(): boolean {
    return true; // estratégia de fallback
  }

  async execute(repository: Repository<Task>): Promise<Task[]> {
    this.logger.log('Executing ActiveProjectFindAllStrategy');
    const query = repository.createQueryBuilder('task')
      .innerJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.reviewer', 'reviewer')
      .leftJoinAndSelect('task.users', 'users')
      .leftJoinAndSelect('task.occupations', 'occupations')
      .where('project.status = :status', { status: true })
      .andWhere('project.status IS NOT NULL');
    
    this.logger.log('Query SQL: ' + query.getQueryAndParameters());
    const result = await query.getMany();
    this.logger.log(`Found ${result.length} tasks`);
    return result;
  }
}