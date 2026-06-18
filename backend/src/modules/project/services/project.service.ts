import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Project } from '../entities/project.entity';
import { User } from '../../user/entities/user.entity';
import { Occupation } from '../../occupation/entities/occupation.entity';
import { Task } from '../../tasks/entities/task.entity';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';

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
  ) {}

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    const { users, teams, ...projectData } = createProjectDto;
    
    // Criar o projeto com os dados básicos
    const project = this.projectRepository.create(projectData);
    const savedProject = await this.projectRepository.save(project);

    // Associar usuários se fornecidos
    if (users && users.length > 0) {
      const usersEntities = await this.userRepository.find({
        where: { id: In(users) }
      });
      savedProject.users = usersEntities;
    }

    // Associar equipes (ocupações) se fornecidas
    if (teams && teams.length > 0) {
      const occupationsEntities = await this.occupationRepository.find({
        where: { id: In(teams) }
      });
      savedProject.occupations = occupationsEntities;
    }

    // Salvar com as associações
    return await this.projectRepository.save(savedProject);
  }

  async findAll(): Promise<Project[]> {
    return await this.projectRepository.find({
      relations: ['tasks', 'tasks.users', 'tasks.occupations', 'users', 'occupations'],
    });
  }

  async findOne(id: number): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['tasks', 'tasks.users', 'tasks.occupations', 'users', 'occupations'],
    });
    
    if (!project) {
      throw new NotFoundException(`Projeto com ID ${id} não encontrado`);
    }
    
    return project;
  }

  async update(id: number, updateProjectDto: UpdateProjectDto): Promise<Project> {
    const { users, teams, ...projectData } = updateProjectDto;
    
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['tasks', 'tasks.users', 'tasks.occupations', 'users', 'occupations'],
    });
    
    if (!project) {
      throw new NotFoundException(`Projeto com ID ${id} não encontrado`);
    }
    
    // Atualizar dados básicos
    Object.assign(project, projectData);

    // Atualizar usuários se fornecidos
    if (users !== undefined) {
      if (users.length > 0) {
        const usersEntities = await this.userRepository.find({
          where: { id: In(users) }
        });
        project.users = usersEntities;
      } else {
        project.users = [];
      }
    }

    // Atualizar equipes (ocupações) se fornecidas
    if (teams !== undefined) {
      if (teams.length > 0) {
        const occupationsEntities = await this.occupationRepository.find({
          where: { id: In(teams) }
        });
        project.occupations = occupationsEntities;
      } else {
        project.occupations = [];
      }
    }

    return await this.projectRepository.save(project);
  }

  async remove(id: number): Promise<void> {
    const project = await this.findOne(id);

    // Primeiro, deletar todas as tarefas associadas ao projeto
    // para evitar violação de foreign key constraint
    if (project.tasks && project.tasks.length > 0) {
      await this.taskRepository.delete({ project_id: id });
    }

    await this.projectRepository.remove(project);
  }

  async findProjectTasks(id: number) {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['tasks', 'tasks.users', 'tasks.occupations'],
    });
    
    if (!project) {
      throw new NotFoundException(`Projeto com ID ${id} não encontrado`);
    }
    
    return project.tasks;
  }
}
