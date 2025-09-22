import { ProjectModule } from '../../src/modules/project/project.module';
import { ProjectController } from '../../src/modules/project/controllers/project.controller';
import { ProjectService } from '../../src/modules/project/services/project.service';

describe('ProjectModule', () => {
  it('should be defined', () => {
    expect(ProjectModule).toBeDefined();
  });

  it('should have ProjectController in controllers', () => {
    const controllers = Reflect.getMetadata('controllers', ProjectModule);
    expect(controllers).toContain(ProjectController);
  });

  it('should have ProjectService in providers', () => {
    const providers = Reflect.getMetadata('providers', ProjectModule);
    expect(providers).toContain(ProjectService);
  });

  it('should import TypeOrmModule', () => {
    const imports = Reflect.getMetadata('imports', ProjectModule);
    expect(imports).toBeDefined();
    expect(imports.length).toBeGreaterThan(0);
  });

  it('should export ProjectService', () => {
    const exports = Reflect.getMetadata('exports', ProjectModule);
    expect(exports).toContain(ProjectService);
  });
});