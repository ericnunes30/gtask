import { ValidationError } from 'class-validator';

export interface FormattedValidationError {
  field: string;
  errors: string[];
}

export function formatValidationErrors(
  errors: ValidationError[],
): FormattedValidationError[] {
  return errors.map((error) => ({
    field: error.property,
    errors: Object.values(error.constraints ?? {}),
  }));
}
