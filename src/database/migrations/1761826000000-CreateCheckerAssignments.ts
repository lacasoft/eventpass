import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCheckerAssignments1761826000000
  implements MigrationInterface
{
  name = 'CreateCheckerAssignments1761826000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla checker_assignments
    await queryRunner.query(`
      CREATE TABLE "checker_assignments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "checkerId" uuid NOT NULL,
        "venueId" uuid NOT NULL,
        "eventId" uuid NOT NULL,
        "assignedBy" uuid NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_checker_assignments" PRIMARY KEY ("id")
      )
    `);

    // Crear índices
    await queryRunner.query(`
      CREATE INDEX "IDX_checker_assignments_checkerId"
      ON "checker_assignments" ("checkerId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_checker_assignments_venueId"
      ON "checker_assignments" ("venueId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_checker_assignments_eventId"
      ON "checker_assignments" ("eventId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_checker_assignments_composite"
      ON "checker_assignments" ("checkerId", "venueId", "eventId")
    `);

    // Crear constraint único para evitar duplicados
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_checker_assignments_unique"
      ON "checker_assignments" ("checkerId", "venueId", "eventId")
    `);

    // Agregar foreign keys
    await queryRunner.query(`
      ALTER TABLE "checker_assignments"
      ADD CONSTRAINT "FK_checker_assignments_checker"
      FOREIGN KEY ("checkerId")
      REFERENCES "users"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "checker_assignments"
      ADD CONSTRAINT "FK_checker_assignments_venue"
      FOREIGN KEY ("venueId")
      REFERENCES "venues"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "checker_assignments"
      ADD CONSTRAINT "FK_checker_assignments_event"
      FOREIGN KEY ("eventId")
      REFERENCES "events"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "checker_assignments"
      ADD CONSTRAINT "FK_checker_assignments_assignedBy"
      FOREIGN KEY ("assignedBy")
      REFERENCES "users"("id")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar foreign keys
    await queryRunner.query(`
      ALTER TABLE "checker_assignments"
      DROP CONSTRAINT "FK_checker_assignments_assignedBy"
    `);

    await queryRunner.query(`
      ALTER TABLE "checker_assignments"
      DROP CONSTRAINT "FK_checker_assignments_event"
    `);

    await queryRunner.query(`
      ALTER TABLE "checker_assignments"
      DROP CONSTRAINT "FK_checker_assignments_venue"
    `);

    await queryRunner.query(`
      ALTER TABLE "checker_assignments"
      DROP CONSTRAINT "FK_checker_assignments_checker"
    `);

    // Eliminar índices
    await queryRunner.query(`
      DROP INDEX "public"."UQ_checker_assignments_unique"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_checker_assignments_composite"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_checker_assignments_eventId"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_checker_assignments_venueId"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_checker_assignments_checkerId"
    `);

    // Eliminar tabla
    await queryRunner.query(`
      DROP TABLE "checker_assignments"
    `);
  }
}
