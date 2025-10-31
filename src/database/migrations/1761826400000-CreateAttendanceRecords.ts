import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAttendanceRecords1761826400000
  implements MigrationInterface
{
  name = 'CreateAttendanceRecords1761826400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear enum para scan_status
    await queryRunner.query(`
      CREATE TYPE "scan_status_enum" AS ENUM (
        'VALID',
        'ALREADY_USED',
        'INVALID',
        'EVENT_CLOSED',
        'NOT_ASSIGNED',
        'WRONG_VENUE',
        'WRONG_SECTOR',
        'CANCELLED',
        'BOOKING_CANCELLED'
      )
    `);

    // Crear tabla attendance_records
    await queryRunner.query(`
      CREATE TABLE "attendance_records" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ticketId" uuid NOT NULL,
        "eventId" uuid NOT NULL,
        "venueId" uuid NOT NULL,
        "checkerId" uuid NOT NULL,
        "scanStatus" "scan_status_enum" NOT NULL,
        "notes" text,
        "sectorId" varchar(100),
        "scannedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attendance_records" PRIMARY KEY ("id")
      )
    `);

    // Crear índices
    await queryRunner.query(`
      CREATE INDEX "IDX_attendance_records_ticketId"
      ON "attendance_records" ("ticketId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_attendance_records_eventId"
      ON "attendance_records" ("eventId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_attendance_records_checkerId"
      ON "attendance_records" ("checkerId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_attendance_records_ticket_event"
      ON "attendance_records" ("ticketId", "eventId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_attendance_records_event_scanned"
      ON "attendance_records" ("eventId", "scannedAt")
    `);

    // Agregar foreign keys
    await queryRunner.query(`
      ALTER TABLE "attendance_records"
      ADD CONSTRAINT "FK_attendance_records_ticket"
      FOREIGN KEY ("ticketId")
      REFERENCES "tickets"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "attendance_records"
      ADD CONSTRAINT "FK_attendance_records_event"
      FOREIGN KEY ("eventId")
      REFERENCES "events"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "attendance_records"
      ADD CONSTRAINT "FK_attendance_records_venue"
      FOREIGN KEY ("venueId")
      REFERENCES "venues"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "attendance_records"
      ADD CONSTRAINT "FK_attendance_records_checker"
      FOREIGN KEY ("checkerId")
      REFERENCES "users"("id")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar foreign keys
    await queryRunner.query(`
      ALTER TABLE "attendance_records"
      DROP CONSTRAINT "FK_attendance_records_checker"
    `);

    await queryRunner.query(`
      ALTER TABLE "attendance_records"
      DROP CONSTRAINT "FK_attendance_records_venue"
    `);

    await queryRunner.query(`
      ALTER TABLE "attendance_records"
      DROP CONSTRAINT "FK_attendance_records_event"
    `);

    await queryRunner.query(`
      ALTER TABLE "attendance_records"
      DROP CONSTRAINT "FK_attendance_records_ticket"
    `);

    // Eliminar índices
    await queryRunner.query(`
      DROP INDEX "public"."IDX_attendance_records_event_scanned"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_attendance_records_ticket_event"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_attendance_records_checkerId"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_attendance_records_eventId"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_attendance_records_ticketId"
    `);

    // Eliminar tabla
    await queryRunner.query(`
      DROP TABLE "attendance_records"
    `);

    // Eliminar enum
    await queryRunner.query(`
      DROP TYPE "scan_status_enum"
    `);
  }
}
