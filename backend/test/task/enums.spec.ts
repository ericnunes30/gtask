import { PriorityLevel, Status } from '../../src/modules/tasks/entities/enums';

describe('Task Enums', () => {
  describe('PriorityLevel', () => {
    it('should have correct priority values', () => {
      expect(PriorityLevel.Low).toBe('baixa');
      expect(PriorityLevel.Medium).toBe('media');
      expect(PriorityLevel.High).toBe('alta');
      expect(PriorityLevel.Urgent).toBe('urgente');
    });

    it('should have all expected priority levels', () => {
      const priorities = Object.values(PriorityLevel);
      expect(priorities).toContain('baixa');
      expect(priorities).toContain('media');
      expect(priorities).toContain('alta');
      expect(priorities).toContain('urgente');
      expect(priorities).toHaveLength(4);
    });

    it('should have string values', () => {
      Object.values(PriorityLevel).forEach(priority => {
        expect(typeof priority).toBe('string');
      });
    });

    it('should be usable in TypeScript enum context', () => {
      const testPriority: PriorityLevel = PriorityLevel.High;
      expect(testPriority).toBe('alta');
      
      // Test that we can use it in a switch statement
      switch (testPriority) {
        case PriorityLevel.Low:
          expect(true).toBe(false); // Should not reach here
          break;
        case PriorityLevel.Medium:
          expect(true).toBe(false); // Should not reach here
          break;
        case PriorityLevel.High:
          expect(true).toBe(true); // Should reach here
          break;
        case PriorityLevel.Urgent:
          expect(true).toBe(false); // Should not reach here
          break;
      }
    });

    it('should be iterable', () => {
      const priorities = [];
      for (const priority in PriorityLevel) {
        if (typeof PriorityLevel[priority as keyof typeof PriorityLevel] === 'string') {
          priorities.push(PriorityLevel[priority as keyof typeof PriorityLevel]);
        }
      }
      expect(priorities).toHaveLength(4);
    });
  });

  describe('Status', () => {
    it('should have correct status values', () => {
      expect(Status.Backlog).toBe('pendente');
      expect(Status.ToDo).toBe('a_fazer');
      expect(Status.InProgress).toBe('em_andamento');
      expect(Status.Review).toBe('em_revisao');
      expect(Status.WaitingClient).toBe('aguardando_cliente');
      expect(Status.Done).toBe('concluido');
      expect(Status.Cancelled).toBe('cancelado');
    });

    it('should have all expected status values', () => {
      const statuses = Object.values(Status);
      expect(statuses).toContain('pendente');
      expect(statuses).toContain('a_fazer');
      expect(statuses).toContain('em_andamento');
      expect(statuses).toContain('em_revisao');
      expect(statuses).toContain('aguardando_cliente');
      expect(statuses).toContain('concluido');
      expect(statuses).toContain('cancelado');
      expect(statuses).toHaveLength(7);
    });

    it('should have string values', () => {
      Object.values(Status).forEach(status => {
        expect(typeof status).toBe('string');
      });
    });

    it('should be usable in TypeScript enum context', () => {
      const testStatus: Status = Status.InProgress;
      expect(testStatus).toBe('em_andamento');
      
      // Test that we can use it in conditional logic
      if (testStatus === Status.InProgress) {
        expect(true).toBe(true);
      } else {
        expect(true).toBe(false);
      }
    });

    it('should be usable in arrays', () => {
      const activeStatuses = [Status.ToDo, Status.InProgress, Status.Review];
      expect(activeStatuses).toContain(Status.InProgress);
      expect(activeStatuses).not.toContain(Status.Done);
      expect(activeStatuses).toHaveLength(3);
    });

    it('should support enum value access', () => {
      // Test that we can access enum values correctly
      expect(Status.Backlog).toBe('pendente');
      expect(Status.ToDo).toBe('a_fazer');
      expect(Status.InProgress).toBe('em_andamento');
      expect(Status.Review).toBe('em_revisao');
      expect(Status.WaitingClient).toBe('aguardando_cliente');
      expect(Status.Done).toBe('concluido');
      expect(Status.Cancelled).toBe('cancelado');
    });
  });

  describe('Enum Relationships', () => {
    it('should work together in type definitions', () => {
      type TaskWithPriorityAndStatus = {
        priority: PriorityLevel;
        status: Status;
      };

      const task: TaskWithPriorityAndStatus = {
        priority: PriorityLevel.High,
        status: Status.InProgress,
      };

      expect(task.priority).toBe('alta');
      expect(task.status).toBe('em_andamento');
    });

    it('should be compatible with string operations', () => {
      const priorityString = PriorityLevel.Urgent;
      const statusString = Status.Done;

      expect(priorityString.toUpperCase()).toBe('URGENTE');
      expect(statusString.toUpperCase()).toBe('CONCLUIDO');
      expect(priorityString.includes('g')).toBe(true);
      expect(statusString.includes('cluido')).toBe(true);
    });

    it('should work in validation scenarios', () => {
      const isValidPriority = (priority: string): priority is PriorityLevel => {
        return Object.values(PriorityLevel).includes(priority as PriorityLevel);
      };

      const isValidStatus = (status: string): status is Status => {
        return Object.values(Status).includes(status as Status);
      };

      expect(isValidPriority('alta')).toBe(true);
      expect(isValidPriority('invalid')).toBe(false);
      expect(isValidStatus('concluido')).toBe(true);
      expect(isValidStatus('invalid')).toBe(false);
    });
  });

  describe('Enum Values Business Logic', () => {
    it('should represent logical workflow for status', () => {
      const workflow = [
        Status.Backlog,
        Status.ToDo,
        Status.InProgress,
        Status.Review,
        Status.WaitingClient,
        Status.Done,
      ];

      workflow.forEach((status, index) => {
        expect(Object.values(Status)).toContain(status);
        if (index > 0) {
          expect(workflow.indexOf(status)).toBeGreaterThan(workflow.indexOf(workflow[index - 1]));
        }
      });
    });

    it('should represent logical hierarchy for priority', () => {
      const priorityOrder = [
        PriorityLevel.Low,
        PriorityLevel.Medium,
        PriorityLevel.High,
        PriorityLevel.Urgent,
      ];

      priorityOrder.forEach((priority, index) => {
        expect(Object.values(PriorityLevel)).toContain(priority);
        if (index > 0) {
          expect(priorityOrder.indexOf(priority)).toBeGreaterThan(
            priorityOrder.indexOf(priorityOrder[index - 1])
          );
        }
      });
    });
  });
});