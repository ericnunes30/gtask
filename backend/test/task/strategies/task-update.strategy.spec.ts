import { RepositoryUpdateStrategy, EntityUpdateStrategy } from '../../src/modules/tasks/strategies/task-update.strategy';
import { Repository } from 'typeorm';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { UpdateTaskDto } from '../../src/modules/tasks/dto/update-task.dto';
import { User } from '../../src/modules/user/entities/user.entity';
import { Occupation } from '../../src/modules/occupation/entities/occupation.entity';
import { mockTaskFactory, mockUserFactory, mockOccupationFactory } from '../mocks/factory';
import { NotFoundException } from '@nestjs/common';

describe('TaskUpdateStrategies', () => {
  const mockTaskId = 1;
  const mockUpdateDto: UpdateTaskDto = { title: 'Updated Task', status: 'concluido' as any };

  describe('RepositoryUpdateStrategy', () => {
    let strategy: RepositoryUpdateStrategy;
    let mockRepository: Partial<Repository<Task>>;

    beforeEach(() => {
      strategy = new RepositoryUpdateStrategy();
      mockRepository = {
        findOne: jest.fn(),
        update: jest.fn(),
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('canHandle', () => {
      it('should return true when repository has update method', () => {
        mockRepository.update = jest.fn();
        expect(strategy.canHandle(mockRepository)).toBe(true);
      });

      it('should return false when repository does not have update method', () => {
        expect(strategy.canHandle(mockRepository)).toBe(false);
      });
    });

    describe('execute', () => {
      it('should update task successfully', async () => {
        const existingTask = mockTaskFactory({ id: mockTaskId });
        const updatedTask = mockTaskFactory({ id: mockTaskId, title: 'Updated Task' });

        (mockRepository.findOne as jest.Mock)
          .mockResolvedValueOnce(existingTask)
          .mockResolvedValueOnce(updatedTask);

        const result = await strategy.execute(mockTaskId, mockUpdateDto, mockRepository as Repository<Task>);

        expect(result).toEqual(updatedTask);
        expect(mockRepository.findOne).toHaveBeenCalledWith({ 
          where: { id: mockTaskId },
          relations: ['users', 'occupations', 'project']
        });
        expect(mockRepository.update).toHaveBeenCalledWith(mockTaskId, mockUpdateDto);
      });

      it('should throw NotFoundException when task not found', async () => {
        (mockRepository.findOne as jest.Mock).mockResolvedValue(null);

        await expect(strategy.execute(mockTaskId, mockUpdateDto, mockRepository as Repository<Task>))
          .rejects.toThrow(NotFoundException);
        await expect(strategy.execute(mockTaskId, mockUpdateDto, mockRepository as Repository<Task>))
          .rejects.toThrow(`Task with ID ${mockTaskId} not found`);
      });

      it('should handle partial updates correctly', async () => {
        const existingTask = mockTaskFactory({ id: mockTaskId, title: 'Original', status: 'pendente' });
        const partialDto: UpdateTaskDto = { title: 'Updated Title Only' };
        const updatedTask = mockTaskFactory({ id: mockTaskId, title: 'Updated Title Only', status: 'pendente' });

        (mockRepository.findOne as jest.Mock)
          .mockResolvedValueOnce(existingTask)
          .mockResolvedValueOnce(updatedTask);

        const result = await strategy.execute(mockTaskId, partialDto, mockRepository as Repository<Task>);

        expect(result.title).toBe('Updated Title Only');
        expect(result.status).toBe('pendente'); // não deve mudar
        expect(mockRepository.update).toHaveBeenCalledWith(mockTaskId, partialDto);
      });

      it('should handle empty DTO', async () => {
        const existingTask = mockTaskFactory({ id: mockTaskId });
        const emptyDto: UpdateTaskDto = {};
        const updatedTask = mockTaskFactory({ id: mockTaskId });

        (mockRepository.findOne as jest.Mock)
          .mockResolvedValueOnce(existingTask)
          .mockResolvedValueOnce(updatedTask);

        const result = await strategy.execute(mockTaskId, emptyDto, mockRepository as Repository<Task>);

        expect(result).toEqual(updatedTask);
        expect(mockRepository.update).toHaveBeenCalledWith(mockTaskId, emptyDto);
      });

      it('should handle update operation failure', async () => {
        const existingTask = mockTaskFactory({ id: mockTaskId });
        const updateError = new Error('Update operation failed');
        
        (mockRepository.findOne as jest.Mock).mockResolvedValueOnce(existingTask);
        (mockRepository.update as jest.Mock).mockRejectedValue(updateError);

        await expect(strategy.execute(mockTaskId, mockUpdateDto, mockRepository as Repository<Task>))
          .rejects.toThrow(updateError);
      });

      it('should handle second findOne failure', async () => {
        const existingTask = mockTaskFactory({ id: mockTaskId });
        const findError = new Error('Failed to find updated task');
        
        (mockRepository.findOne as jest.Mock)
          .mockResolvedValueOnce(existingTask)
          .mockRejectedValueOnce(findError);
        (mockRepository.update as jest.Mock).mockResolvedValue({ affected: 1 });

        await expect(strategy.execute(mockTaskId, mockUpdateDto, mockRepository as Repository<Task>))
          .rejects.toThrow(findError);
      });
    });
  });

  describe('EntityUpdateStrategy', () => {
    let strategy: EntityUpdateStrategy;
    let mockRepository: Partial<Repository<Task>>;

    beforeEach(() => {
      strategy = new EntityUpdateStrategy();
      mockRepository = {
        findOne: jest.fn(),
        save: jest.fn(),
        manager: {
          find: jest.fn(),
        },
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('canHandle', () => {
      it('should always return true (fallback strategy)', () => {
        expect(strategy.canHandle()).toBe(true);
      });
    });

    describe('execute', () => {
      it('should update task entity successfully', async () => {
        const existingTask = mockTaskFactory({ id: mockTaskId });
        const updatedTask = mockTaskFactory({ id: mockTaskId, title: 'Updated Task' });

        (mockRepository.findOne as jest.Mock).mockResolvedValue(existingTask);
        (mockRepository.save as jest.Mock).mockResolvedValue(updatedTask);

        const result = await strategy.execute(mockTaskId, mockUpdateDto, mockRepository as Repository<Task>);

        expect(result).toEqual(updatedTask);
        expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: mockTaskId } });
        expect(mockRepository.save).toHaveBeenCalledWith(existingTask);
      });

      it('should update with users when userIds provided', async () => {
        const existingTask = mockTaskFactory({ id: mockTaskId });
        const users = [mockUserFactory({ id: 1 }), mockUserFactory({ id: 2 })];
        const updateDtoWithUsers: UpdateTaskDto = { ...mockUpdateDto, users: [1, 2] };
        const updatedTask = mockTaskFactory({ id: mockTaskId, users });

        (mockRepository.findOne as jest.Mock).mockResolvedValue(existingTask);
        (mockRepository.manager!.find as jest.Mock)
          .mockResolvedValueOnce(users);
        (mockRepository.save as jest.Mock).mockResolvedValue(updatedTask);

        const result = await strategy.execute(mockTaskId, updateDtoWithUsers, mockRepository as Repository<Task>);

        expect(result.users).toEqual(users);
        expect(mockRepository.manager!.find).toHaveBeenCalledWith(User, { where: { id: [1, 2] } });
      });

      it('should update with occupations when occupationIds provided', async () => {
        const existingTask = mockTaskFactory({ id: mockTaskId });
        const occupations = [mockOccupationFactory({ id: 1 }), mockOccupationFactory({ id: 2 })];
        const updateDtoWithOccupations: UpdateTaskDto = { ...mockUpdateDto, occupations: [1, 2] };
        const updatedTask = mockTaskFactory({ id: mockTaskId, occupations });

        (mockRepository.findOne as jest.Mock).mockResolvedValue(existingTask);
        (mockRepository.manager!.find as jest.Mock)
          .mockResolvedValueOnce(occupations);
        (mockRepository.save as jest.Mock).mockResolvedValue(updatedTask);

        const result = await strategy.execute(mockTaskId, updateDtoWithOccupations, mockRepository as Repository<Task>);

        expect(result.occupations).toEqual(occupations);
        expect(mockRepository.manager!.find).toHaveBeenCalledWith(Occupation, { where: { id: [1, 2] } });
      });

      it('should throw NotFoundException when task not found', async () => {
        (mockRepository.findOne as jest.Mock).mockResolvedValue(null);

        await expect(strategy.execute(mockTaskId, mockUpdateDto, mockRepository as Repository<Task>))
          .rejects.toThrow(NotFoundException);
        await expect(strategy.execute(mockTaskId, mockUpdateDto, mockRepository as Repository<Task>))
          .rejects.toThrow(`Task with ID ${mockTaskId} not found`);
      });

      it('should update both users and occupations together', async () => {
        const existingTask = mockTaskFactory({ id: mockTaskId });
        const users = [mockUserFactory({ id: 1 }), mockUserFactory({ id: 2 })];
        const occupations = [mockOccupationFactory({ id: 1 }), mockOccupationFactory({ id: 2 })];
        const updateDtoWithBoth: UpdateTaskDto = { 
          ...mockUpdateDto, 
          users: [1, 2], 
          occupations: [1, 2] 
        };
        const updatedTask = mockTaskFactory({ id: mockTaskId, users, occupations });

        (mockRepository.findOne as jest.Mock).mockResolvedValue(existingTask);
        (mockRepository.manager!.find as jest.Mock)
          .mockResolvedValueOnce(users)
          .mockResolvedValueOnce(occupations);
        (mockRepository.save as jest.Mock).mockResolvedValue(updatedTask);

        const result = await strategy.execute(mockTaskId, updateDtoWithBoth, mockRepository as Repository<Task>);

        expect(result.users).toEqual(users);
        expect(result.occupations).toEqual(occupations);
        expect(mockRepository.manager!.find).toHaveBeenCalledTimes(2);
      });

      it('should handle null users array', async () => {
        const existingTask = mockTaskFactory({ id: mockTaskId });
        const updateDtoWithNullUsers: UpdateTaskDto = { 
          ...mockUpdateDto, 
          users: null 
        };
        const updatedTask = mockTaskFactory({ id: mockTaskId, title: 'Updated Task' });

        (mockRepository.findOne as jest.Mock).mockResolvedValue(existingTask);
        (mockRepository.save as jest.Mock).mockResolvedValue(updatedTask);

        const result = await strategy.execute(mockTaskId, updateDtoWithNullUsers, mockRepository as Repository<Task>);

        expect(mockRepository.manager!.find).not.toHaveBeenCalled();
        expect(result.users).toBeUndefined();
      });

      it('should handle empty users array', async () => {
        const existingTask = mockTaskFactory({ id: mockTaskId });
        const updateDtoWithEmptyUsers: UpdateTaskDto = { 
          ...mockUpdateDto, 
          users: [] 
        };
        const updatedTask = mockTaskFactory({ id: mockTaskId, title: 'Updated Task' });

        (mockRepository.findOne as jest.Mock).mockResolvedValue(existingTask);
        (mockRepository.manager!.find as jest.Mock).mockResolvedValue([]);
        (mockRepository.save as jest.Mock).mockResolvedValue(updatedTask);

        const result = await strategy.execute(mockTaskId, updateDtoWithEmptyUsers, mockRepository as Repository<Task>);

        expect(result.users).toEqual([]);
      });

      it('should handle save operation failure', async () => {
        const existingTask = mockTaskFactory({ id: mockTaskId });
        const saveError = new Error('Save operation failed');
        
        (mockRepository.findOne as jest.Mock).mockResolvedValue(existingTask);
        (mockRepository.save as jest.Mock).mockRejectedValue(saveError);

        await expect(strategy.execute(mockTaskId, mockUpdateDto, mockRepository as Repository<Task>))
          .rejects.toThrow(saveError);
      });

      it('should handle manager find failure for users', async () => {
        const existingTask = mockTaskFactory({ id: mockTaskId });
        const findError = new Error('Failed to find users');
        const updateDtoWithUsers: UpdateTaskDto = { ...mockUpdateDto, users: [1] };
        
        (mockRepository.findOne as jest.Mock).mockResolvedValue(existingTask);
        (mockRepository.manager!.find as jest.Mock).mockRejectedValue(findError);

        await expect(strategy.execute(mockTaskId, updateDtoWithUsers, mockRepository as Repository<Task>))
          .rejects.toThrow(findError);
      });

      it('should preserve original relations when not updating', async () => {
        const originalUsers = [mockUserFactory({ id: 1 })];
        const originalOccupations = [mockOccupationFactory({ id: 1 })];
        const existingTask = mockTaskFactory({ 
          id: mockTaskId, 
          users: originalUsers,
          occupations: originalOccupations
        });
        const updatedTask = mockTaskFactory({ 
          id: mockTaskId, 
          title: 'Updated Task',
          users: originalUsers,
          occupations: originalOccupations
        });

        (mockRepository.findOne as jest.Mock).mockResolvedValue(existingTask);
        (mockRepository.save as jest.Mock).mockResolvedValue(updatedTask);

        const result = await strategy.execute(mockTaskId, mockUpdateDto, mockRepository as Repository<Task>);

        expect(result.users).toBe(originalUsers); // mesma instância
        expect(result.occupations).toBe(originalOccupations); // mesma instância
        expect(mockRepository.manager!.find).not.toHaveBeenCalled();
      });
    });
  });
});