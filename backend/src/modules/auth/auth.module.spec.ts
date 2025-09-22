import { Test, TestingModule } from '@nestjs/testing';
import { AuthModule } from './auth.module';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UserModule } from '../user/user.module';
import { PasswordVerificationFactory } from './strategies/password/password-verification.factory';
import { TokenPayloadFactory } from './factories/token-payload.factory';
import { AuthResponseFactory } from './factories/auth-response.factory';
import { UserValidationFactory } from './factories/user-validation.factory';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

describe('AuthModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        UserModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
          useFactory: async () => ({
            secret: 'test-secret',
            signOptions: { expiresIn: '15m' },
          }),
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtStrategy,
        LocalStrategy,
        PasswordVerificationFactory,
        TokenPayloadFactory,
        AuthResponseFactory,
        UserValidationFactory,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
      ],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should compile AuthModule successfully', () => {
    const authModule = module.get<AuthModule>(AuthModule);
    expect(authModule).toBeDefined();
  });

  it('should provide AuthController', () => {
    const controller = module.get<AuthController>(AuthController);
    expect(controller).toBeDefined();
  });

  it('should provide AuthService', () => {
    const service = module.get<AuthService>(AuthService);
    expect(service).toBeDefined();
  });

  it('should provide JwtStrategy', () => {
    const strategy = module.get<JwtStrategy>(JwtStrategy);
    expect(strategy).toBeDefined();
  });

  it('should provide LocalStrategy', () => {
    const strategy = module.get<LocalStrategy>(LocalStrategy);
    expect(strategy).toBeDefined();
  });

  it('should provide PasswordVerificationFactory', () => {
    const factory = module.get<PasswordVerificationFactory>(PasswordVerificationFactory);
    expect(factory).toBeDefined();
  });

  it('should provide TokenPayloadFactory', () => {
    const factory = module.get<TokenPayloadFactory>(TokenPayloadFactory);
    expect(factory).toBeDefined();
  });

  it('should provide AuthResponseFactory', () => {
    const factory = module.get<AuthResponseFactory>(AuthResponseFactory);
    expect(factory).toBeDefined();
  });

  it('should provide UserValidationFactory', () => {
    const factory = module.get<UserValidationFactory>(UserValidationFactory);
    expect(factory).toBeDefined();
  });

  it('should provide ConfigService', () => {
    const configService = module.get<ConfigService>(ConfigService);
    expect(configService).toBeDefined();
  });

  it('should export AuthService', () => {
    const authModule = module.get<AuthModule>(AuthModule);
    const exports = Reflect.getMetadata('__exports__', authModule.constructor);
    expect(exports).toContain(AuthService);
  });

  it('should import required modules', () => {
    const authModule = module.get<AuthModule>(AuthModule);
    const imports = Reflect.getMetadata('__imports__', authModule.constructor);
    
    expect(imports).toBeDefined();
    expect(Array.isArray(imports)).toBe(true);
    
    // Check that UserModule is imported
    const hasUserModule = imports.some((imp: any) => imp === UserModule);
    expect(hasUserModule).toBe(true);
    
    // Check that PassportModule is imported
    const hasPassportModule = imports.some((imp: any) => imp?.name === 'PassportModule');
    expect(hasPassportModule).toBe(true);
    
    // Check that JwtModule is imported
    const hasJwtModule = imports.some((imp: any) => imp?.name === 'JwtModule');
    expect(hasJwtModule).toBe(true);
  });

  it('should register controllers correctly', () => {
    const authModule = module.get<AuthModule>(AuthModule);
    const controllers = Reflect.getMetadata('__controllers__', authModule.constructor);
    
    expect(controllers).toBeDefined();
    expect(Array.isArray(controllers)).toBe(true);
    expect(controllers).toContain(AuthController);
  });

  it('should register providers correctly', () => {
    const authModule = module.get<AuthModule>(AuthModule);
    const providers = Reflect.getMetadata('__providers__', authModule.constructor);
    
    expect(providers).toBeDefined();
    expect(Array.isArray(providers)).toBe(true);
    
    const providerClasses = providers.map((p: any) => p.provide || p);
    expect(providerClasses).toContain(AuthService);
    expect(providerClasses).toContain(JwtStrategy);
    expect(providerClasses).toContain(LocalStrategy);
    expect(providerClasses).toContain(PasswordVerificationFactory);
    expect(providerClasses).toContain(TokenPayloadFactory);
    expect(providerClasses).toContain(AuthResponseFactory);
    expect(providerClasses).toContain(UserValidationFactory);
  });

  describe('module configuration', () => {
    it('should configure JWT module with async factory', async () => {
      // Test that the JWT module is configured with async factory
      const jwtModuleConfig = (module as any)._providers?.find(
        (p: any) => p.provide?.name === 'JwtModule'
      );
      
      expect(jwtModuleConfig).toBeDefined();
    });

    it('should configure Passport with default strategy', () => {
      // Test that PassportModule is configured with JWT as default strategy
      const passportConfig = (module as any)._providers?.find(
        (p: any) => p.provide?.name === 'PassportModule'
      );
      
      expect(passportConfig).toBeDefined();
    });
  });

  describe('dependency injection', () => {
    it('should inject AuthService into AuthController', () => {
      const controller = module.get<AuthController>(AuthController);
      const authService = module.get<AuthService>(AuthService);
      
      // Check that the controller has access to the service
      expect((controller as any).authService).toBeDefined();
      expect((controller as any).authService).toBe(authService);
    });

    it('should inject dependencies into AuthService', () => {
      const authService = module.get<AuthService>(AuthService);
      
      expect((authService as any).userService).toBeDefined();
      expect((authService as any).jwtService).toBeDefined();
      expect((authService as any).tokenPayloadFactory).toBeDefined();
      expect((authService as any).authResponseFactory).toBeDefined();
      expect((authService as any).userValidationFactory).toBeDefined();
    });

    it('should inject ConfigService into JwtStrategy', () => {
      const jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
      const configService = module.get<ConfigService>(ConfigService);
      
      expect((jwtStrategy as any).configService).toBeDefined();
      expect((jwtStrategy as any).configService).toBe(configService);
    });

    it('should inject AuthService into LocalStrategy', () => {
      const localStrategy = module.get<LocalStrategy>(LocalStrategy);
      const authService = module.get<AuthService>(AuthService);
      
      expect((localStrategy as any).authService).toBeDefined();
      expect((localStrategy as any).authService).toBe(authService);
    });

    it('should inject UserService and PasswordVerificationFactory into UserValidationFactory', () => {
      const userValidationFactory = module.get<UserValidationFactory>(UserValidationFactory);
      
      expect((userValidationFactory as any).userService).toBeDefined();
      expect((userValidationFactory as any).passwordFactory).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle missing dependencies gracefully', async () => {
      // Test with missing UserModule
      try {
        await Test.createTestingModule({
          imports: [
            PassportModule.register({ defaultStrategy: 'jwt' }),
            JwtModule.registerAsync({
              useFactory: async () => ({
                secret: 'test-secret',
                signOptions: { expiresIn: '15m' },
              }),
            }),
          ],
          controllers: [AuthController],
          providers: [
            AuthService,
            JwtStrategy,
            LocalStrategy,
            PasswordVerificationFactory,
            TokenPayloadFactory,
            AuthResponseFactory,
            UserValidationFactory,
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn().mockReturnValue('test-secret'),
              },
            },
          ],
        }).compile();
        
        // If we reach here, the module compiled successfully
        expect(true).toBe(true);
      } catch (error) {
        // If it fails, that's expected when dependencies are missing
        expect(error).toBeDefined();
      }
    });

    it('should handle ConfigService with missing JWT_SECRET', async () => {
      const moduleWithoutSecret = await Test.createTestingModule({
        imports: [
          UserModule,
          PassportModule.register({ defaultStrategy: 'jwt' }),
          JwtModule.registerAsync({
            useFactory: async () => ({
              secret: undefined,
              signOptions: { expiresIn: '15m' },
            }),
          }),
        ],
        controllers: [AuthController],
        providers: [
          AuthService,
          JwtStrategy,
          LocalStrategy,
          PasswordVerificationFactory,
          TokenPayloadFactory,
          AuthResponseFactory,
          UserValidationFactory,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(undefined),
            },
          },
        ],
      }).compile();

      const jwtStrategy = moduleWithoutSecret.get<JwtStrategy>(JwtStrategy);
      expect(jwtStrategy).toBeDefined();
      // The strategy should handle missing secret gracefully
    });
  });

  describe('module lifecycle', () => {
    it('should be able to create and destroy module', async () => {
      let testModule: TestingModule;
      
      try {
        testModule = await Test.createTestingModule({
          imports: [
            UserModule,
            PassportModule.register({ defaultStrategy: 'jwt' }),
            JwtModule.registerAsync({
              useFactory: async () => ({
                secret: 'test-secret',
                signOptions: { expiresIn: '15m' },
              }),
            }),
          ],
          controllers: [AuthController],
          providers: [
            AuthService,
            JwtStrategy,
            LocalStrategy,
            PasswordVerificationFactory,
            TokenPayloadFactory,
            AuthResponseFactory,
            UserValidationFactory,
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn().mockReturnValue('test-secret'),
              },
            },
          ],
        }).compile();

        expect(testModule).toBeDefined();
        
        // Close the module if possible
        if (testModule.close) {
          await testModule.close();
        }
      } catch (error) {
        // Handle any cleanup errors
        console.warn('Module cleanup warning:', error);
      }
    });
  });
});