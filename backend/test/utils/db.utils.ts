import { DataSource } from 'typeorm';
import { User } from '../../src/modules/user/entities/user.entity';
import { Role } from '../../src/modules/role/entities/role.entity';
import { Occupation } from '../../src/modules/occupation/entities/occupation.entity';

export async function truncateTables(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  const tables = await queryRunner.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%' AND tablename NOT LIKE 'sql_%' AND tablename != 'migrations' AND tablename != 'typeorm_migrations'`,
  );

  if (tables.length > 0) {
    const tableNames = tables
      .map((t: { tablename: string }) => `"${t.tablename}"`)
      .join(', ');
    await queryRunner.query(
      `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`,
    );
  }

  await queryRunner.release();
}

export async function seedRoles(dataSource: DataSource): Promise<Role[]> {
  const roleRepository = dataSource.getRepository(Role);
  const roles = [
    { name: 'ADMIN', description: 'Administrator' },
    { name: 'USER', description: 'Regular User' },
  ];
  const created = roleRepository.create(roles);
  return await roleRepository.save(created);
}

export async function seedOccupations(
  dataSource: DataSource,
): Promise<Occupation[]> {
  const occupationRepository = dataSource.getRepository(Occupation);
  const occupations = [
    { name: 'Developer' },
    { name: 'Designer' },
    { name: 'Manager' },
  ];
  const created = occupationRepository.create(occupations);
  return await occupationRepository.save(created);
}

export async function seedAdminUser(
  dataSource: DataSource,
  overrides?: { name?: string; email?: string; password?: string },
): Promise<User> {
  const userRepository = dataSource.getRepository(User);
  const roleRepository = dataSource.getRepository(Role);

  const user = userRepository.create({
    name: overrides?.name ?? 'Admin User',
    email: overrides?.email ?? 'admin@test.com',
    password: overrides?.password ?? 'admin123',
    is_active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const savedUser = await userRepository.save(user);

  const adminRole = await roleRepository.findOne({ where: { name: 'ADMIN' } });
  if (adminRole) {
    await dataSource.query(
      `INSERT INTO users_roles (user_id, role_id) VALUES ($1, $2)`,
      [savedUser.id, adminRole.id],
    );
  }

  return savedUser;
}
