export interface PasswordVerificationStrategy {
  canHandle(hashedPassword: string): boolean;
  verify(plainPassword: string, hashedPassword: string): Promise<boolean>;
}