import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Project } from '../entities/project.entity';
import { User } from '../../user/entities/user.entity';
import { Occupation } from '../../occupation/entities/occupation.entity';
import { Task } from '../../tasks/entities/task.entity';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ProjectNotFoundException } from '../exceptions/project-not-found.exception';
import { RelatedUsersNotFoundException } from '../exceptions/related-users-not-found.exception';
import { RelatedOccupationsNotFoundException } from '../exceptions/related-occupations-not-found.exception';
import { validateEntityIds } from '../../exception/helpers/validate-entity-ids.helper';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Occupation)
    private occupationRepository: Repository<Occupation>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    const { users, teams, ...projectData } = createProjectDto;

    // Criar o projeto com os dados básicos
    const project = this.projectRepository.create(projectData);
    const savedProject = await this.projectRepository.save(project);

    // Associar usuários se fornecidos
    if (users && users.length > 0) {
      savedProject.users = await validateEntityIds(
        this.userRepository,
        users,
        (missing) => new RelatedUsersNotFoundException(missing),
      );
    }

    // Associar equipes (ocupações) se fornecidas
    if (teams && teams.length > 0) {
      savedProject.occupations = await validateEntityIds(
        this.occupationRepository,
        teams,
        (missing) => new RelatedOccupationsNotFoundException(missing),
      );
    }

    // Salvar com as associações
    const savedProjectWithAssociations = await this.projectRepository.save(savedProject);

    this.eventEmitter.emit('project.created', { project: savedProjectWithAssociations });

    return savedProjectWithAssociations;
  }

  async findAll(): Promise<Project[]> {
    return await this.projectRepository.find({
      relations: [
        'tasks',
        'tasks.users',
        'tasks.occupations',
        'users',
        'occupations',
      ],
    });
  }

  async findOne(id: number): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: [
        'tasks',
        'tasks.users',
        'tasks.occupations',
        'users',
        'occupations',
      ],
    });

    if (!project) {
      throw new ProjectNotFoundException(id);
    }

    return project;
  }

  async update(
    id: number,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    const { users, teams, ...projectData } = updateProjectDto;

    const project = await this.projectRepository.findOne({
      where: { id },
      relations: [
        'tasks',
        'tasks.users',
        'tasks.occupations',
        'users',
        'occupations',
      ],
    });

    if (!project) {
      throw new ProjectNotFoundException(id);
    }

    // Atualizar dados básicos
    Object.assign(project, projectData);

    // Atualizar usuários se fornecidos
    if (users !== undefined) {
      project.users =
        users.length > 0
          ? await validateEntityIds(
              this.userRepository,
              users,
              (missing) => new RelatedUsersNotFoundException(missing),
            )
          : [];
    }

    // Atualizar equipes (ocupações) se fornecidas
    if (teams !== undefined) {
      project.occupations =
        teams.length > 0
          ? await validateEntityIds(
              this.occupationRepository,
              teams,
              (missing) => new RelatedOccupationsNotFoundException(missing),
            )
          : [];
    }

    const updatedProject = await this.projectRepository.save(project);

    this.eventEmitter.emit('project.updated', { project: updatedProject });

    return updatedProject;
  }

  async remove(id: number): Promise<void> {
    const project = await this.findOne(id);

    // Primeiro, deletar todas as tarefas associadas ao projeto
    // para evitar violação de foreign key constraint
    if (project.tasks && project.tasks.length > 0) {
      await this.taskRepository.delete({ project_id: id });
    }

    await this.projectRepository.remove(project);

    this.eventEmitter.emit('project.deleted', { projectId: id });
  }

  async findProjectTasks(id: number) {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['tasks', 'tasks.users', 'tasks.occupations'],
    });

    if (!project) {
      throw new ProjectNotFoundException(id);
    }

    return project.tasks;
  }
}
