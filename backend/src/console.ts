import { CommandFactory } from 'nest-commander';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await CommandFactory.run(AppModule, {
    logger: new Logger('Console'),
  });

  // Opcional: você pode adicionar lógica aqui se precisar
  // por exemplo, fechar conexões de banco de dados se necessário
}

bootstrap();
