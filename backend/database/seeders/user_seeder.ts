import User from '#models/user'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class UserSeeder extends BaseSeeder {
  async run() {
    // Cria usuários de teste com ocupações

    // 1. Administrador - Gerente de Projetos
    await User.create({
      name: 'Administrador',
      email: 'admin@example.com',
      password: 'password123',
      occupationId: 4, // Gerente de Projetos
    })

    // 2. Usuário Teste - Analista de Qualidade
    await User.create({
      name: 'Usuário Teste',
      email: 'user@example.com',
      password: 'password123',
      occupationId: 5, // Analista de Qualidade
    })

    // 3. Gerente de Projetos - Gerente de Projetos
    await User.create({
      name: 'Gerente de Projetos',
      email: 'gerente@example.com',
      password: 'password123',
      occupationId: 4, // Gerente de Projetos
    })

    // 4. Desenvolvedor - Desenvolvedor Backend
    await User.create({
      name: 'Desenvolvedor',
      email: 'dev@example.com',
      password: 'password123',
      occupationId: 2, // Desenvolvedor Backend
    })

    // 5. Designer - Designer UI/UX
    await User.create({
      name: 'Designer',
      email: 'designer@example.com',
      password: 'password123',
      occupationId: 3, // Designer UI/UX
    })

    // Os usuários foram criados.
    // Se outros seeders precisarem deles, devem consultá-los no banco de dados.
  }
}
