import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class SetupDto {
  @IsString()
  @MinLength(2, { message: 'Nome deve ter no mínimo 2 caracteres' })
  @MaxLength(255, { message: 'Nome deve ter no máximo 255 caracteres' })
  name: string;

  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  password: string;
}
