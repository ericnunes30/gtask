import { IsNotEmpty, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsInt()
  task_id: number;

  @IsOptional()
  @IsInt()
  parentId?: number;
}
