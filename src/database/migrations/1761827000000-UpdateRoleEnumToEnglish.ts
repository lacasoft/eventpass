import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateRoleEnumToEnglish1761827000000 implements MigrationInterface {
  name = 'UpdateRoleEnumToEnglish1761827000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Create new enum with English values only
    await queryRunner.query(`
      CREATE TYPE "public"."users_role_enum_new" AS ENUM('customer', 'organizer', 'checker', 'admin', 'super-admin')
    `);

    // Step 2: Add temporary column with new enum type
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "role_new" "public"."users_role_enum_new"
    `);

    // Step 3: Copy and transform data from old column to new column
    await queryRunner.query(`
      UPDATE "users"
      SET "role_new" = CASE
        WHEN "role"::text = 'cliente' THEN 'customer'::"public"."users_role_enum_new"
        WHEN "role"::text = 'organizador' THEN 'organizer'::"public"."users_role_enum_new"
        WHEN "role"::text = 'checker' THEN 'checker'::"public"."users_role_enum_new"
        WHEN "role"::text = 'admin' THEN 'admin'::"public"."users_role_enum_new"
        WHEN "role"::text = 'super-admin' THEN 'super-admin'::"public"."users_role_enum_new"
      END
    `);

    // Step 4: Drop old column
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "role"
    `);

    // Step 5: Rename new column to original name
    await queryRunner.query(`
      ALTER TABLE "users"
      RENAME COLUMN "role_new" TO "role"
    `);

    // Step 6: Drop old enum
    await queryRunner.query(`
      DROP TYPE "public"."users_role_enum"
    `);

    // Step 7: Rename new enum to original name
    await queryRunner.query(`
      ALTER TYPE "public"."users_role_enum_new" RENAME TO "users_role_enum"
    `);

    // Step 8: Set NOT NULL and default value
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "role" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "role" SET DEFAULT 'customer'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Create old enum with Spanish values
    await queryRunner.query(`
      CREATE TYPE "public"."users_role_enum_old" AS ENUM('cliente', 'organizador', 'checker', 'admin', 'super-admin')
    `);

    // Step 2: Add temporary column with old enum type
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "role_old" "public"."users_role_enum_old"
    `);

    // Step 3: Copy and transform data from current column to old column
    await queryRunner.query(`
      UPDATE "users"
      SET "role_old" = CASE
        WHEN "role"::text = 'customer' THEN 'cliente'::"public"."users_role_enum_old"
        WHEN "role"::text = 'organizer' THEN 'organizador'::"public"."users_role_enum_old"
        WHEN "role"::text = 'checker' THEN 'checker'::"public"."users_role_enum_old"
        WHEN "role"::text = 'admin' THEN 'admin'::"public"."users_role_enum_old"
        WHEN "role"::text = 'super-admin' THEN 'super-admin'::"public"."users_role_enum_old"
      END
    `);

    // Step 4: Drop current column
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "role"
    `);

    // Step 5: Rename old column to original name
    await queryRunner.query(`
      ALTER TABLE "users"
      RENAME COLUMN "role_old" TO "role"
    `);

    // Step 6: Drop current enum
    await queryRunner.query(`
      DROP TYPE "public"."users_role_enum"
    `);

    // Step 7: Rename old enum to original name
    await queryRunner.query(`
      ALTER TYPE "public"."users_role_enum_old" RENAME TO "users_role_enum"
    `);

    // Step 8: Set NOT NULL and default value
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "role" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "role" SET DEFAULT 'cliente'
    `);
  }
}
