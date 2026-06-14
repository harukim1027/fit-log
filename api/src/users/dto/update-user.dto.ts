import { IsBoolean, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * 프로필 수정(PATCH /api/users/me) 허용 필드.
 *
 * 전역 ValidationPipe({ whitelist: true })가 이 DTO에 정의되지 않은 필드를 자동으로
 * 제거하므로, 프론트가 엔티티에 없는 키를 보내도 TypeORM update에 흘러가 500이 나지 않는다.
 * (이전엔 컨트롤러가 `@Body() body: any`라 화이트리스트가 동작하지 않았다.)
 *
 * weight/height는 소수 허용(@IsNumber), 나머지 수치는 정수(@IsInt).
 * password/email/provider 등 민감/불변 필드는 의도적으로 제외한다.
 */
export class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsNumber() weight?: number;
  @IsOptional() @IsNumber() height?: number;
  @IsOptional() @IsInt() age?: number;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() goal?: string;
  @IsOptional() @IsInt() weeklyGoal?: number;
  @IsOptional() @IsInt() targetCalories?: number;
  @IsOptional() @IsInt() targetCarbsRatio?: number;
  @IsOptional() @IsInt() targetProteinRatio?: number;
  @IsOptional() @IsInt() targetFatRatio?: number;
  @IsOptional() @IsBoolean() isOnboardingDone?: boolean;
}
