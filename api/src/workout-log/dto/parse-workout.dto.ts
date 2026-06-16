import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ParseWorkoutDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  text: string;
}
