import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsNotEmpty,
  ValidateNested,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';

class SetInputDto {
  @IsOptional()
  @IsNumber()
  weight: number | null;

  @IsOptional()
  @IsInt()
  reps: number | null;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

class ExerciseInputDto {
  // 카탈로그 운동 id (string PK). picker에서 온 값만 허용 — 서버에서 다시 검증.
  @IsString()
  @IsNotEmpty()
  exerciseId: string;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SetInputDto)
  sets: SetInputDto[];
}

export class AddExercisesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ExerciseInputDto)
  exercises: ExerciseInputDto[];
}
