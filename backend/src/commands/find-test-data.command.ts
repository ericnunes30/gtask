import { Command, CommandRunner } from 'nest-commander';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../modules/user/entities/user.entity';
import { Project } from '../modules/project/entities/project.entity';
import { Occupation } from '../modules/occupation/entities/occupation.entity';

@Command({
  name: 'find:test-data',
  description:
    'Encontra IDs de usuários, projetos e equipes para usar em testes.',
})
export class FindTestDataCommand extends CommandRunner {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Occupation)
    private readonly occupationRepository: Repository<Occupation>,
  ) {
    super();
  }

  async run(): Promise<void> {
    console.log('Buscando dados para teste...');

    const users = await this.userRepository.find({ take: 5 });
    const projects = await this.projectRepository.find({ take: 5 });
    const occupations = await this.occupationRepository.find({ take: 5 });

    console.log('\n--- Usuários Encontrados ---');
    if (users.length > 0) {
      users.forEach((user) =>
        console.log(`ID: ${user.id}, Nome: ${user.name}, Email: ${user.email}`),
      );
    } else {
      console.log('Nenhum usuário encontrado.');
    }

    console.log('\n--- Projetos Encontrados ---');
    if (projects.length > 0) {
      projects.forEach((project) =>
        console.log(`ID: ${project.id}, Título: ${project.title}`),
      );
    } else {
      console.log('Nenhum projeto encontrado.');
    }

    console.log('\n--- Equipes (Ocupações) Encontradas ---');
    if (occupations.length > 0) {
      occupations.forEach((occ) =>
        console.log(`ID: ${occ.id}, Nome: ${occ.name}`),
      );
    } else {
      console.log('Nenhuma equipe encontrada.');
    }

    console.log('\nUse estes IDs para atualizar o arquivo TEST_COMMANDS.md');
  }
}
