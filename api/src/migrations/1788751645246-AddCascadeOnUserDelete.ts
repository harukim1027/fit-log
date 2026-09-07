import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCascadeOnUserDelete1788751645246 implements MigrationInterface {
    name = 'AddCascadeOnUserDelete1788751645246'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workout_sessions" DROP CONSTRAINT "FK_b4b5ff8f7c2cb3c3c18e07cc5ce"`);
        await queryRunner.query(`ALTER TABLE "water_logs" DROP CONSTRAINT "FK_d81c9581256f120c96b365b405c"`);
        await queryRunner.query(`ALTER TABLE "rest_days" DROP CONSTRAINT "FK_2419d87b8df7c7e9cc7d99d9b53"`);
        await queryRunner.query(`ALTER TABLE "favorites" DROP CONSTRAINT "FK_e747534006c6e3c2f09939da60f"`);
        await queryRunner.query(`ALTER TABLE "diet_logs" DROP CONSTRAINT "FK_75665de59f61dac53ddec59c84d"`);
        await queryRunner.query(`ALTER TABLE "workout_sessions" ADD CONSTRAINT "FK_b4b5ff8f7c2cb3c3c18e07cc5ce" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "water_logs" ADD CONSTRAINT "FK_d81c9581256f120c96b365b405c" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "rest_days" ADD CONSTRAINT "FK_2419d87b8df7c7e9cc7d99d9b53" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "favorites" ADD CONSTRAINT "FK_e747534006c6e3c2f09939da60f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "diet_logs" ADD CONSTRAINT "FK_75665de59f61dac53ddec59c84d" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "diet_logs" DROP CONSTRAINT "FK_75665de59f61dac53ddec59c84d"`);
        await queryRunner.query(`ALTER TABLE "favorites" DROP CONSTRAINT "FK_e747534006c6e3c2f09939da60f"`);
        await queryRunner.query(`ALTER TABLE "rest_days" DROP CONSTRAINT "FK_2419d87b8df7c7e9cc7d99d9b53"`);
        await queryRunner.query(`ALTER TABLE "water_logs" DROP CONSTRAINT "FK_d81c9581256f120c96b365b405c"`);
        await queryRunner.query(`ALTER TABLE "workout_sessions" DROP CONSTRAINT "FK_b4b5ff8f7c2cb3c3c18e07cc5ce"`);
        await queryRunner.query(`ALTER TABLE "diet_logs" ADD CONSTRAINT "FK_75665de59f61dac53ddec59c84d" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "favorites" ADD CONSTRAINT "FK_e747534006c6e3c2f09939da60f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "rest_days" ADD CONSTRAINT "FK_2419d87b8df7c7e9cc7d99d9b53" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "water_logs" ADD CONSTRAINT "FK_d81c9581256f120c96b365b405c" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workout_sessions" ADD CONSTRAINT "FK_b4b5ff8f7c2cb3c3c18e07cc5ce" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
