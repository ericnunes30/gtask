import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import { TaskService } from '../../tasks/services/task.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Task } from '../../tasks/entities/task.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TimerService {
  private readonly logger = new Logger(TimerService.name);
  private activeTimers = new Map<number, { interval: NodeJS.Timeout; seconds: number }>();
  private server: Server;

  constructor(
    private readonly taskService: TaskService,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  setServer(server: Server) {
    this.server = server;
  }

  async start(taskId: number, userId: number) {
    if (this.activeTimers.has(taskId)) {
      this.logger.warn(`Timer for task ${taskId} is already running.`);
      return;
    }

    const task = await this.taskRepository.findOneBy({ id: taskId });
    if (!task) {
      this.logger.error(`Task with ID ${taskId} not found.`);
      return;
    }

    // Stop any other running timers for the same user
    for (const [otherTaskId, timerData] of this.activeTimers.entries()) {
        const otherTask = await this.taskRepository.findOne({ where: { id: otherTaskId }, relations: ['users'] });
        if (otherTask && otherTask.users.some(user => user.id === userId)) {
            this.logger.log(`Pausing timer for task ${otherTaskId} because user ${userId} started a new one.`);
            this.pause(otherTaskId);
        }
    }

    const initialSeconds = task.timer || 0;
    this.logger.log(`Starting timer for task ${taskId} at ${initialSeconds} seconds.`);

    const interval = setInterval(() => {
      const timerData = this.activeTimers.get(taskId);
      if (timerData) {
        timerData.seconds++;
        this.server.to(`task_${taskId}`).emit('timer.tick', {
          taskId,
          seconds: timerData.seconds,
        });
      }
    }, 1000);

    this.activeTimers.set(taskId, { interval, seconds: initialSeconds });

    this.server.to(`task_${taskId}`).emit('timer.started', { 
      taskId: taskId, 
      userId: userId, 
      startTime: new Date() 
    });
  }

  async pause(taskId: number) {
    const timerData = this.activeTimers.get(taskId);
    if (!timerData) {
      this.logger.warn(`Timer for task ${taskId} is not running.`);
      return;
    }

    clearInterval(timerData.interval);
    this.activeTimers.delete(taskId);

    this.logger.log(`Paused timer for task ${taskId} at ${timerData.seconds} seconds. Saving to DB.`);
    
    await this.taskService.updateTimer(taskId, timerData.seconds);

    this.server.to(`task_${taskId}`).emit('timer.paused', {
      taskId,
      seconds: timerData.seconds,
    });
  }
}
