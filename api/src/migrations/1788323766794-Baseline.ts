import { MigrationInterface, QueryRunner } from "typeorm";

export class Baseline1788323766794 implements MigrationInterface {
    name = 'Baseline1788323766794'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "workout_sets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "weight" double precision NOT NULL, "reps" integer NOT NULL, "completed" boolean NOT NULL DEFAULT true, "unit" character varying DEFAULT 'kg', "exerciseId" uuid, CONSTRAINT "PK_5ad75c97e58e8c660a48926d438" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "workout_exercises" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "category" character varying NOT NULL, "settings" text, "tip" character varying, "isSingleArm" boolean NOT NULL DEFAULT false, "targetMuscles" text, "restSeconds" integer, "targetReps" character varying, "order" integer NOT NULL DEFAULT '0', "sessionId" uuid, CONSTRAINT "PK_377f9ead6fd69b29f0d0feb1028" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "workout_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date NOT NULL, "durationMinutes" integer NOT NULL DEFAULT '0', "note" character varying, "caloriesBurned" double precision, "fromRoutineId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_eea00e05dc78d40b55a588c9f57" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password" character varying, "provider" character varying NOT NULL DEFAULT 'local', "providerId" character varying, "name" character varying, "targetCalories" integer NOT NULL DEFAULT '2000', "weight" double precision, "height" double precision, "age" integer, "gender" character varying, "goal" character varying, "weeklyGoal" integer, "isOnboardingDone" boolean NOT NULL DEFAULT false, "targetCarbsRatio" integer NOT NULL DEFAULT '50', "targetProteinRatio" integer NOT NULL DEFAULT '30', "targetFatRatio" integer NOT NULL DEFAULT '20', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "workout_setting_presets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_ce8edd001555e371b4658588e99" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "water_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date NOT NULL, "amount" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_7793241dc433ad0ac30ec9a906e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "routines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "name" character varying NOT NULL, "exercises" jsonb NOT NULL DEFAULT '[]', "isPublic" boolean NOT NULL DEFAULT false, "shareCode" character varying, "copyCount" integer NOT NULL DEFAULT '0', "orderIndex" integer NOT NULL DEFAULT '0', "color" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_abb0be5644634336391a2cdc22e" UNIQUE ("shareCode"), CONSTRAINT "PK_6847e8f0f74e65a6f10409dee9f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "rest_days" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "UQ_0dcea48f880ed21033a05c7e0a1" UNIQUE ("userId", "date"), CONSTRAINT "PK_4a139a33a5391fff6207b12faf8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "custom_foods" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "foodName" character varying NOT NULL, "calories" double precision NOT NULL, "protein" double precision NOT NULL, "carbs" double precision NOT NULL, "fat" double precision NOT NULL, "amount" double precision NOT NULL, "unit" character varying NOT NULL, "isPublic" boolean NOT NULL DEFAULT false, "copyCount" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9ce28d45b99412070f26f749d63" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "favorites" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "foodName" character varying NOT NULL, "calories" double precision NOT NULL, "protein" double precision NOT NULL, "carbs" double precision NOT NULL, "fat" double precision NOT NULL, "amount" integer NOT NULL DEFAULT '100', "unit" character varying NOT NULL DEFAULT 'g', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_890818d27523748dd36a4d1bdc8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "exercises" ("id" character varying NOT NULL, "name" character varying NOT NULL, "bodyPart" character varying NOT NULL DEFAULT '', "equipment" character varying, "target" character varying, "secondaryMuscles" text NOT NULL DEFAULT '[]', "instructions" text NOT NULL DEFAULT '[]', "gifUrl" character varying, "category" character varying, "difficulty" character varying, "met" double precision, "caloriesPerMinute" double precision, "description" text, "nameKo" character varying, "userId" character varying, CONSTRAINT "PK_c4c46f5fa89a58ba7c2d894e3c3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "diet_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date NOT NULL, "mealType" character varying NOT NULL, "foodName" character varying NOT NULL, "calories" double precision NOT NULL, "protein" double precision NOT NULL, "carbs" double precision NOT NULL, "fat" double precision NOT NULL, "amount" double precision NOT NULL, "unit" character varying NOT NULL, "snackCardId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_8c935447d2548aecff0c143821c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "workout_sets" ADD CONSTRAINT "FK_b6f291312131dd1fa81a5bea995" FOREIGN KEY ("exerciseId") REFERENCES "workout_exercises"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workout_exercises" ADD CONSTRAINT "FK_4faf00f278921908504bcb1fb70" FOREIGN KEY ("sessionId") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workout_sessions" ADD CONSTRAINT "FK_b4b5ff8f7c2cb3c3c18e07cc5ce" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workout_setting_presets" ADD CONSTRAINT "FK_4bb5f4c84d7865fd1b42df48cd6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "water_logs" ADD CONSTRAINT "FK_d81c9581256f120c96b365b405c" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "routines" ADD CONSTRAINT "FK_6ae06dff0a9aad63673a8b48d0a" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "rest_days" ADD CONSTRAINT "FK_2419d87b8df7c7e9cc7d99d9b53" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "custom_foods" ADD CONSTRAINT "FK_10f2276c7fa6e21ee267916d96d" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "favorites" ADD CONSTRAINT "FK_e747534006c6e3c2f09939da60f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "diet_logs" ADD CONSTRAINT "FK_75665de59f61dac53ddec59c84d" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "diet_logs" DROP CONSTRAINT "FK_75665de59f61dac53ddec59c84d"`);
        await queryRunner.query(`ALTER TABLE "favorites" DROP CONSTRAINT "FK_e747534006c6e3c2f09939da60f"`);
        await queryRunner.query(`ALTER TABLE "custom_foods" DROP CONSTRAINT "FK_10f2276c7fa6e21ee267916d96d"`);
        await queryRunner.query(`ALTER TABLE "rest_days" DROP CONSTRAINT "FK_2419d87b8df7c7e9cc7d99d9b53"`);
        await queryRunner.query(`ALTER TABLE "routines" DROP CONSTRAINT "FK_6ae06dff0a9aad63673a8b48d0a"`);
        await queryRunner.query(`ALTER TABLE "water_logs" DROP CONSTRAINT "FK_d81c9581256f120c96b365b405c"`);
        await queryRunner.query(`ALTER TABLE "workout_setting_presets" DROP CONSTRAINT "FK_4bb5f4c84d7865fd1b42df48cd6"`);
        await queryRunner.query(`ALTER TABLE "workout_sessions" DROP CONSTRAINT "FK_b4b5ff8f7c2cb3c3c18e07cc5ce"`);
        await queryRunner.query(`ALTER TABLE "workout_exercises" DROP CONSTRAINT "FK_4faf00f278921908504bcb1fb70"`);
        await queryRunner.query(`ALTER TABLE "workout_sets" DROP CONSTRAINT "FK_b6f291312131dd1fa81a5bea995"`);
        await queryRunner.query(`DROP TABLE "diet_logs"`);
        await queryRunner.query(`DROP TABLE "exercises"`);
        await queryRunner.query(`DROP TABLE "favorites"`);
        await queryRunner.query(`DROP TABLE "custom_foods"`);
        await queryRunner.query(`DROP TABLE "rest_days"`);
        await queryRunner.query(`DROP TABLE "routines"`);
        await queryRunner.query(`DROP TABLE "water_logs"`);
        await queryRunner.query(`DROP TABLE "workout_setting_presets"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "workout_sessions"`);
        await queryRunner.query(`DROP TABLE "workout_exercises"`);
        await queryRunner.query(`DROP TABLE "workout_sets"`);
    }

}
