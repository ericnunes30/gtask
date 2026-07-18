import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';
import { Request, Response } from 'express';
import { AllExceptionsFilter } from './all-exceptions.filter';

const createMockHost = (requestOverrides: Partial<Request> = {}) => {
  const request = {
    url: '/test-path',
    ...requestOverrides,
  } as unknown as Request;

  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  return {
    host: {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
        getResponse: jest.fn().mockReturnValue(response),
      }),
    } as unknown as ArgumentsHost,
    response,
  };
};

describe('AllExceptionsFilter', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    filter = new AllExceptionsFilter();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should return 404 for NotFoundException with code', () => {
    const { host, response } = createMockHost();

    filter.catch(new NotFoundException('User not found'), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    const body = (response.json as jest.Mock).mock.calls[0][0];
    expect(body).toMatchObject({
      success: false,
      statusCode: HttpStatus.NOT_FOUND,
      error: 'NotFoundException',
      code: 'NotFoundException',
      message: 'User not found',
      path: '/test-path',
    });
    expect(body.timestamp).toBeDefined();
  });

  it('should return BadRequestException with details', () => {
    const { host, response } = createMockHost();
    const details = [{ field: 'email', errors: ['email must be an email'] }];

    filter.catch(
      new BadRequestException({
        message: 'Invalid request data',
        details,
      }),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    const body = (response.json as jest.Mock).mock.calls[0][0];
    expect(body).toMatchObject({
      success: false,
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'BadRequestException',
      code: 'BadRequestException',
      message: 'Invalid request data',
      details,
      path: '/test-path',
    });
  });

  it('should map QueryFailedError code 23505 to 409', () => {
    const { host, response } = createMockHost();
    const error = new QueryFailedError(
      'INSERT ...',
      [],
      new Error('unique violation') as never,
    );
    (error.driverError as { code: string }).code = '23505';

    filter.catch(error, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    const body = (response.json as jest.Mock).mock.calls[0][0];
    expect(body).toMatchObject({
      success: false,
      statusCode: HttpStatus.CONFLICT,
      error: 'Conflict',
      code: 'ConflictException',
      message: 'Resource already exists',
    });
  });

  it('should return 500 for a generic Error', () => {
    const { host, response } = createMockHost();

    filter.catch(new Error('Something went wrong'), host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    const body = (response.json as jest.Mock).mock.calls[0][0];
    expect(body).toMatchObject({
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      code: 'InternalServerErrorException',
      message: 'Something went wrong',
    });
    expect(body.stack).toBeDefined();
  });

  it('should omit stack in production', () => {
    process.env.NODE_ENV = 'production';
    const { host, response } = createMockHost();

    filter.catch(new Error('Hidden error'), host);

    const body = (response.json as jest.Mock).mock.calls[0][0];
    expect(body.stack).toBeUndefined();
  });

  it('should map QueryFailedError code 23503 to 400 Bad Request', () => {
    const { host, response } = createMockHost();
    const error = new QueryFailedError(
      'INSERT ...',
      [],
      new Error('foreign key violation') as never,
    );
    (error.driverError as { code: string }).code = '23503';

    filter.catch(error, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    const body = (response.json as jest.Mock).mock.calls[0][0];
    expect(body).toMatchObject({
      success: false,
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      code: 'BadRequestException',
      message: 'Foreign key constraint violation',
    });
  });

  it('should map QueryFailedError with unknown code to 500 fallback', () => {
    const { host, response } = createMockHost();
    const error = new QueryFailedError(
      'UPDATE ...',
      [],
      new Error('timeout') as never,
    );
    (error.driverError as { code: string }).code = '08006';

    filter.catch(error, host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    const body = (response.json as jest.Mock).mock.calls[0][0];
    expect(body).toMatchObject({
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      code: 'QueryFailedError',
      message: 'Database error',
    });
  });

  it('should map EntityNotFoundError to 404 Not Found', () => {
    const { host, response } = createMockHost();
    const error = new EntityNotFoundError('User', { id: 999 });

    filter.catch(error, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    const body = (response.json as jest.Mock).mock.calls[0][0];
    expect(body).toMatchObject({
      success: false,
      statusCode: HttpStatus.NOT_FOUND,
      error: 'Not Found',
      code: 'NotFoundException',
      message: 'Resource not found',
    });
  });

  it('should return generic 500 message for non-Error exception', () => {
    const { host, response } = createMockHost();

    filter.catch('a plain string thrown', host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    const body = (response.json as jest.Mock).mock.calls[0][0];
    expect(body).toMatchObject({
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      code: 'InternalServerErrorException',
      message: 'Internal server error',
    });
    expect(body.stack).toBeUndefined();
  });
});
