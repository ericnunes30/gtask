import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Task } from '../entities/task.entity';
import { Repository } from 'typeorm';
import { TaskNotFoundException } from '../exceptions/task-not-found.exception';

@Injectable()
export class TimerService {
  private readonly logger = new Logger(TimerService.name);
  private activeTimers = new Map<
    number,
    { interval: NodeJS.Timeout; seconds: number }
  >();

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async start(taskId: number, userId: number) {
    if (this.activeTimers.has(taskId)) {
      this.logger.warn(`Timer for task ${taskId} is already running.`);
      return;
    }

    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['users'],
    });
    if (!task) {
      throw new TaskNotFoundException(taskId);
    }

    // Para qualquer outro timer que o mesmo usuário tenha ativo, pause-o.
    for (const [otherTaskId, _timerData] of this.activeTimers.entries()) {
      const otherTask = await this.taskRepository.findOne({
        where: { id: otherTaskId },
        relations: ['users'],
      });
      if (!otherTask) {
        throw new TaskNotFoundException(otherTaskId);
      }
      if (otherTask.users.some((user) => user.id === userId)) {
        this.logger.log(
          `Pausing timer for task ${otherTaskId} because user ${userId} started a new one.`,
        );
        await this.pause(otherTaskId, userId);
      }
    }

    const initialSeconds = task.timer || 0;
    this.logger.log(
      `Starting timer for task ${taskId} for user ${userId} at ${initialSeconds} seconds.`,
    );

    const interval = setInterval(() => {
      const timerData = this.activeTimers.get(taskId);
      if (timerData) {
        timerData.seconds++;
        this.eventEmitter.emit('timer.tick', {
          taskId,
          seconds: timerData.seconds,
        });
      }
    }, 1000);

    this.activeTimers.set(taskId, { interval, seconds: initialSeconds });

    this.eventEmitter.emit('timer.started', {
      taskId: taskId,
      userId: userId,
    });
  }

  async pause(taskId: number, userId: number) {
    const timerData = this.activeTimers.get(taskId);
    if (!timerData) {
      this.logger.log(
        `Timer for task ${taskId} is not running. Ignoring pause request.`,
      );
      return;
    }

    clearInterval(timerData.interval);
    this.activeTimers.delete(taskId);

    this.logger.log(
      `Paused timer for task ${taskId} at ${timerData.seconds} seconds. Saving to DB.`,
    );

    await this.taskRepository.update(taskId, { timer: timerData.seconds });

    this.eventEmitter.emit('timer.paused', {
      taskId,
      seconds: timerData.seconds,
      userId,
    });
  }
}
