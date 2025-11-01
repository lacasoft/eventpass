import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckerRole1761825600000 implements MigrationInterface {
  name = 'AddCheckerRole1761825600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'checker' value to users_role_enum
    await queryRunner.query(`
      ALTER TYPE "public"."users_role_enum" ADD VALUE 'checker' AFTER 'organizer'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL doesn't support removing enum values directly
    // We need to recreate the enum without the 'checker' value
    await queryRunner.query(`
      -- Create temporary enum without 'checker'
      CREATE TYPE "public"."users_role_enum_old" AS ENUM('customer', 'organizer', 'admin', 'super-admin');
    `);

    await queryRunner.query(`
      -- Update users table to use temporary enum
      ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum_old" USING "role"::text::"public"."users_role_enum_old";
    `);

    await queryRunner.query(`
      -- Drop old enum
      DROP TYPE "public"."users_role_enum";
    `);

    await queryRunner.query(`
      -- Rename temporary enum to original name
      ALTER TYPE "public"."users_role_enum_old" RENAME TO "users_role_enum";
    `);
  }
}
