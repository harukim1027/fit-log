import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWeeklyGoalDefault1788325077790 implements MigrationInterface {
    name = 'AddWeeklyGoalDefault1788325077790'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "weeklyGoal" SET DEFAULT '4'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "weeklyGoal" DROP DEFAULT`);
    }

}
