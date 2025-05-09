import Occupation from '#models/occupation'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import logger from '@adonisjs/core/services/logger'

export default class OccupationSeeder extends BaseSeeder {
  async run() {
    logger.info('OccupationSeeder: Iniciando criação/verificação de ocupações.')
    // TRUNCATE removido

    const occupationsData = [
      { name: 'Desenvolvedor Frontend' },
      { name: 'Desenvolvedor Backend' },
      { name: 'Designer UI/UX' },
      { name: 'Gerente de Projetos' },
      { name: 'Analista de Qualidade' },
    ]

    for (const occData of occupationsData) {
      await Occupation.firstOrCreate({ name: occData.name }, occData)
      logger.info(`OccupationSeeder: Ocupaç��o "${occData.name}" verificada/criada.`)
    }
    logger.info('OccupationSeeder: Ocupações verificadas/criadas com sucesso.')
  }
}
