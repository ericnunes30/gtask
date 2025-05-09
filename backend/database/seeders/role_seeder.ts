import Role from '#models/role'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import logger from '@adonisjs/core/services/logger' // Usando logger importado para consistência

export default class RoleSeeder extends BaseSeeder {
  async run() {
    try {
      // TRUNCATE removido para idempotência
      logger.info('RoleSeeder: Iniciando criação/verificação de roles.')

      const rolesData = [
        {
          name: 'administrador', // Minúsculo, conforme solicitado
          description: 'Acesso total ao sistema',
        },
        {
          name: 'gerente', // Minúsculo
          description: 'Gerencia projetos e equipes',
        },
        {
          name: 'membro', // Minúsculo
          description: 'Membro da equipe com acesso básico',
        },
        {
          name: 'convidado', // Minúsculo
          description: 'Acesso limitado apenas para visualização',
        }
      ]

      for (const roleData of rolesData) {
        // Tenta encontrar a role pelo nome (ignorando maiúsculas/minúsculas na busca se o DB suportar, mas cria com o nome exato)
        let existingRole = await Role.query().whereRaw('LOWER(name) = ?', [roleData.name.toLowerCase()]).first()

        if (existingRole) {
          // Se encontrou e o nome não é exatamente igual (ex: "Administrador" vs "administrador"), atualiza para o nome correto.
          if (existingRole.name !== roleData.name) {
            existingRole.name = roleData.name
            existingRole.description = roleData.description // Pode atualizar a descrição também
            await existingRole.save()
            logger.info(`RoleSeeder: Role "${existingRole.name}" atualizada para nome "${roleData.name}".`)
          } else {
            logger.info(`RoleSeeder: Role "${roleData.name}" já existe e está correta.`)
          }
        } else {
          // Se não encontrou, cria a nova role
          await Role.create(roleData)
          logger.info(`RoleSeeder: Role "${roleData.name}" criada.`)
        }
      }

      logger.info('RoleSeeder: Funções verificadas/criadas/atualizadas com sucesso!')
    } catch (error) {
      logger.error({ err: error }, 'RoleSeeder: Erro ao verificar/criar/atualizar funções.')
    }
  }
}
