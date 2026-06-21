import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLock } from '../entities/task-lock.entity';
import { randomUUID } from 'crypto';

/**
 * Erros de driver do TypeORM/Postgres que carregam `code` (ex.: '23505' para unique violation).
 * Usamos um type guard para acessar `code` sem recorrer a `any`.
 */
function getErrorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

@Injectable()
export class LockService {
  private readonly logger = new Logger(LockService.name);
  private readonly instanceId = randomUUID(); // ID único para esta instância da aplicação

  constructor(
    @InjectRepository(TaskLock)
    private readonly taskLockRepository: Repository<TaskLock>,
  ) {
    this.logger.log(
      `LockService initialized with instanceId: ${this.instanceId}`,
    );
  }

  async acquire(lockKey: string): Promise<boolean> {
    this.logger.log(
      `Instance ${this.instanceId} attempting to acquire lock: ${lockKey}`,
    );
    try {
      const lock = this.taskLockRepository.create({
        lockKey,
        instanceId: this.instanceId,
      });
      await this.taskLockRepository.save(lock);
      this.logger.log(
        `Instance ${this.instanceId} successfully acquired lock: ${lockKey}`,
      );
      return true;
    } catch (error: unknown) {
      // Código '23505' é para violação de restrição de unicidade no PostgreSQL
      if (getErrorCode(error) === '23505') {
        this.logger.log(
          `Failed to acquire lock: ${lockKey}. Already locked by another instance.`,
        );
        return false;
      }
      this.logger.error(
        `An unexpected error occurred while acquiring lock: ${lockKey}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error; // Lança outros erros inesperados
    }
  }

  async release(lockKey: string): Promise<void> {
    this.logger.log(`Instance ${this.instanceId} releasing lock: ${lockKey}`);
    try {
      await this.taskLockRepository.delete({ lockKey });
      this.logger.log(
        `Instance ${this.instanceId} successfully released lock: ${lockKey}`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed to release lock: ${lockKey}`,
        error instanceof Error ? error.stack : String(error),
      );
      // Não lançamos o erro aqui para não quebrar a aplicação principal se a liberação falhar,
      // mas o log é crucial para a depuração.
    }
  }
}
