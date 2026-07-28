import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';

export async function loginAsAdmin(
  app: INestApplication,
  _dataSource: DataSource,
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/setup')
    .send({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'admin123',
    })
    .expect(201);

  return {
    accessToken: response.body.data.accessToken,
    refreshToken: response.body.data.refreshToken,
  };
}

export async function loginUser(
  app: INestApplication,
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(201);

  return {
    accessToken: response.body.data.accessToken,
    refreshToken: response.body.data.refreshToken,
  };
}
