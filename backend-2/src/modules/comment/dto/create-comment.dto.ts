import { IsNotEmpty, IsInt, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsNotEmpty()
  content: string;

  @IsInt()
  task_id: number;

  @IsInt()
  user_id: number;

  @IsOptional()
  @IsInt()
  parentId?: number;
}