import User from '#models/user'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Hash from '@adonisjs/core/services/hash' // Necessário para hashear senhas se não existirem
import logger from '@adonisjs/core/services/logger'

export default class UserSeeder extends BaseSeeder {
  async run() {
    logger.info('UserSeeder: Iniciando criação/verificação de usuários.')

    const usersData = [
      {
        name: 'Eric',
        email: 'equipesurreal@surrealgroup.com.br',
        password: '123456', // Lembre-se de usar uma senha forte em produção e gerenciar via .env
        occupationId: 4, // Gerente de Projetos (Exemplo, ajuste se necessário)
      },
      {
        name: 'Usuário Teste',
        email: 'user@example.com',
        password: 'password123',
        occupationId: 5, // Analista de Qualidade
      },
      {
        name: 'Gerente de Projetos',
        email: 'gerente@example.com',
        password: 'password123',
        occupationId: 4, // Gerente de Projetos
      },
      {
        name: 'Desenvolvedor',
        email: 'dev@example.com',
        password: 'password123',
        occupationId: 2, // Desenvolvedor Backend
      },
      {
        name: 'Designer',
        email: 'designer@example.com',
        password: 'password123',
        occupationId: 3, // Designer UI/UX
      },
    ]

    const createdUsers: { [key: string]: User } = {}

    for (const userData of usersData) {
      const { email, ...dataToCreate } = userData
      
      // Hashear a senha antes de tentar criar/encontrar o usuário
      // Apenas se a senha ainda não estiver hasheada (firstOrCreate não re-hashea)
      const passwordToStore = dataToCreate.password.startsWith('$scrypt$')
        ? dataToCreate.password
        : await Hash.make(dataToCreate.password)

      const user = await User.firstOrCreate(
        { email: email }, // Critério para encontrar
        { ...dataToCreate, password: passwordToStore } // Dados para criar se não encontrar (ou para atualizar se usar updateOrCreate)
      )
      logger.info(`UserSeeder: Usuário "${user.name}" com email "${user.email}" verificado/criado.`)

      // Mapear usuários criados para fácil acesso, se necessário (ex: para retornar)
      if (userData.email === 'equipesurreal@surrealgroup.com.br') createdUsers.admin = user
      if (userData.email === 'user@example.com') createdUsers.tester = user
      if (userData.email === 'gerente@example.com') createdUsers.manager = user
      if (userData.email === 'dev@example.com') createdUsers.developer = user
      if (userData.email === 'designer@example.com') createdUsers.designer = user
    }
    
    logger.info('UserSeeder: Usuários verificados/criados com sucesso.')
    
    // O retorno pode não ser mais necessário se os outros seeders buscarem os usuários pelo email/ID
    // return createdUsers
  }
}
