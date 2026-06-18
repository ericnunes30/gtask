import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLock } from '../entities/task-lock.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class LockService {
  private readonly logger = new Logger(LockService.name);
  private readonly instanceId = randomUUID(); // ID único para esta instância da aplicação

  constructor(
    @InjectRepository(TaskLock)
    private readonly taskLockRepository: Repository<TaskLock>,
  ) {
    this.logger.log(`LockService initialized with instanceId: ${this.instanceId}`);
  }

  async acquire(lockKey: string): Promise<boolean> {
    this.logger.log(`Instance ${this.instanceId} attempting to acquire lock: ${lockKey}`);
    try {
      const lock = this.taskLockRepository.create({
        lockKey,
        instanceId: this.instanceId,
      });
      await this.taskLockRepository.save(lock);
      this.logger.log(`Instance ${this.instanceId} successfully acquired lock: ${lockKey}`);
      return true;
    } catch (error) {
      // Código '23505' é para violação de restrição de unicidade no PostgreSQL
      if (error.code === '23505') {
        this.logger.log(`Failed to acquire lock: ${lockKey}. Already locked by another instance.`);
        return false;
      }
      this.logger.error(`An unexpected error occurred while acquiring lock: ${lockKey}`, error.stack);
      throw error; // Lança outros erros inesperados
    }
  }

  async release(lockKey: string): Promise<void> {
    this.logger.log(`Instance ${this.instanceId} releasing lock: ${lockKey}`);
    try {
      await this.taskLockRepository.delete({ lockKey });
      this.logger.log(`Instance ${this.instanceId} successfully released lock: ${lockKey}`);
    } catch (error) {
      this.logger.error(`Failed to release lock: ${lockKey}`, error.stack);
      // Não lançamos o erro aqui para não quebrar a aplicação principal se a liberação falhar,
      // mas o log é crucial para a depuração.
    }
  }
}
