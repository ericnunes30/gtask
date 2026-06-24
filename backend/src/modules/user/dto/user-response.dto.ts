import { IsEmail, IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class UserResponseDto {
  @IsNumber()
  id!: number;

  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @IsString({ message: 'Nome deve ser uma string' })
  name!: string;

  @IsNotEmpty({ message: 'Email é obrigatório' })
  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  email!: string;
}
