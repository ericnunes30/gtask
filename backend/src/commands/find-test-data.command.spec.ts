import { Repository } from 'typeorm';
import { User } from '../modules/user/entities/user.entity';
import { Project } from '../modules/project/entities/project.entity';
import { Occupation } from '../modules/occupation/entities/occupation.entity';
import { FindTestDataCommand } from './find-test-data.command';

describe('FindTestDataCommand', () => {
  let command: FindTestDataCommand;
  let userRepository: { find: jest.Mock };
  let projectRepository: { find: jest.Mock };
  let occupationRepository: { find: jest.Mock };
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    userRepository = { find: jest.fn() };
    projectRepository = { find: jest.fn() };
    occupationRepository = { find: jest.fn() };
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    command = new FindTestDataCommand(
      userRepository as unknown as Repository<User>,
      projectRepository as unknown as Repository<Project>,
      occupationRepository as unknown as Repository<Occupation>,
    );
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should log found users, projects and occupations', async () => {
    userRepository.find.mockResolvedValue([
      { id: 1, name: 'Alice', email: 'alice@test.com' },
    ]);
    projectRepository.find.mockResolvedValue([{ id: 10, title: 'Project A' }]);
    occupationRepository.find.mockResolvedValue([
      { id: 100, name: 'Dev Team' },
    ]);

    await command.run();

    expect(userRepository.find).toHaveBeenCalledWith({ take: 5 });
    expect(projectRepository.find).toHaveBeenCalledWith({ take: 5 });
    expect(occupationRepository.find).toHaveBeenCalledWith({ take: 5 });
    expect(consoleSpy).toHaveBeenCalledWith(
      'ID: 1, Nome: Alice, Email: alice@test.com',
    );
    expect(consoleSpy).toHaveBeenCalledWith('ID: 10, Título: Project A');
    expect(consoleSpy).toHaveBeenCalledWith('ID: 100, Nome: Dev Team');
  });

  it('should log "not found" messages when all repositories return empty', async () => {
    userRepository.find.mockResolvedValue([]);
    projectRepository.find.mockResolvedValue([]);
    occupationRepository.find.mockResolvedValue([]);

    await command.run();

    expect(consoleSpy).toHaveBeenCalledWith('Nenhum usuário encontrado.');
    expect(consoleSpy).toHaveBeenCalledWith('Nenhum projeto encontrado.');
    expect(consoleSpy).toHaveBeenCalledWith('Nenhuma equipe encontrada.');
  });
});
