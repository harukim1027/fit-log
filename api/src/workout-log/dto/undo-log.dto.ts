import { IsArray, IsString, ArrayMaxSize } from 'class-validator';

export class UndoLogDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  ids: string[];
}
