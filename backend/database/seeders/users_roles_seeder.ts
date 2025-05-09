import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import Role from '#models/role'
import logger from '@adonisjs/core/services/logger'

export default class UsersRolesSeeder extends BaseSeeder {
  async run() {
    logger.info('UsersRolesSeeder: Iniciando associação de roles a usuários.')
    try {
      // Buscar usuários (assumindo que user_seeder já garantiu que eles existem e usou nomes/emails corretos)
      // E roles (assumindo que role_seeder já garantiu que elas existem com nomes minúsculos)
      const userEric = await User.findBy('email', 'equipesurreal@surrealgroup.com.br') // Seu admin principal
      const userTester = await User.findBy('email', 'user@example.com')
      const userManager = await User.findBy('email', 'gerente@example.com')
      const userDeveloper = await User.findBy('email', 'dev@example.com')
      const userDesigner = await User.findBy('email', 'designer@example.com')

      const roleAdmin = await Role.findBy('name', 'administrador') // Nome minúsculo
      const roleManager = await Role.findBy('name', 'gerente')     // Nome minúsculo
      const roleMember = await Role.findBy('name', 'membro')       // Nome minúsculo
      const roleGuest = await Role.findBy('name', 'convidado')     // Nome minúsculo

      // Função auxiliar para associar role se não existir
      const associateRole = async (user: User | null, role: Role | null, userName: string, roleName: string) => {
        if (user && role) {
          const existingRelation = await user.related('roles').query().where('role_id', role.id).first()
          if (!existingRelation) {
            await user.related('roles').attach([role.id])
            logger.info(`UsersRolesSeeder: Role "${roleName}" associada ao usuário "${userName}".`)
          } else {
            logger.info(`UsersRolesSeeder: Usuário "${userName}" já possui a role "${roleName}".`)
          }
        } else {
          if (!user) logger.warn(`UsersRolesSeeder: Usuário "${userName}" não encontrado para associação de role.`)
          if (!role) logger.warn(`UsersRolesSeeder: Role "${roleName}" não encontrada para associação.`)
        }
      }

      // Associar usuários a funções
      await associateRole(userEric, roleAdmin, 'Eric (equipesurreal@surrealgroup.com.br)', 'administrador')
      await associateRole(userManager, roleManager, 'gerente@example.com', 'gerente')
      await associateRole(userDeveloper, roleMember, 'dev@example.com', 'membro')
      await associateRole(userDesigner, roleMember, 'designer@example.com', 'membro')
      await associateRole(userTester, roleGuest, 'user@example.com', 'convidado')
      
      // O usuário 'admin@example.com' do seeder original não está mais sendo explicitamente associado aqui,
      // pois o foco é no usuário 'Eric'. Se 'admin@example.com' ainda existir e precisar de uma role,
      // você precisaria adicionar uma chamada associateRole para ele.

      logger.info('UsersRolesSeeder: Associações de roles a usuários verificadas/criadas.')
    } catch (error) {
      logger.error({ err: error }, 'UsersRolesSeeder: Erro ao associar roles a usuários.')
    }
  }
}
