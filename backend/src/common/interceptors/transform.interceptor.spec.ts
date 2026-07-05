import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<{ id: number; name: string }>;

  beforeEach(() => {
    interceptor = new TransformInterceptor<{ id: number; name: string }>();
  });

  it('should wrap emitted data into { data, success, message }', (done) => {
    const payload = { id: 1, name: 'test' };
    const context = {} as ExecutionContext;
    const callHandler: CallHandler = {
      handle: () => of(payload),
    };

    interceptor.intercept(context, callHandler).subscribe((result) => {
      expect(result).toEqual({
        data: payload,
        success: true,
        message: 'Operation completed successfully',
      });
      done();
    });
  });
});
