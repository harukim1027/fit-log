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

class NamedExerciseDto {
  // 운동 이름 (picker가 제공 — 앱은 이름+카테고리 기반, 카탈로그 id 미사용)
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetMuscles?: string[];

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SetInputDto)
  sets: SetInputDto[];
}

export class AddExercisesDto {
  // 있으면 해당 세션에 누적, 없으면 오늘 세션 get-or-create.
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => NamedExerciseDto)
  exercises: NamedExerciseDto[];
}
