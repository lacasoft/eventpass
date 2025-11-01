import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1761780965124 implements MigrationInterface {
  name = 'Migration1761780965124';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "venues" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(200) NOT NULL,
                "address" character varying(500) NOT NULL,
                "city" character varying(100) NOT NULL,
                "country" character(2) NOT NULL,
                "capacity" integer NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                CONSTRAINT "PK_cb0f885278d12384eb7a81818be" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."users_role_enum" AS ENUM('customer', 'organizer', 'admin', 'super-admin')
        `);
    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying NOT NULL,
                "password" character varying NOT NULL,
                "firstName" character varying,
                "lastName" character varying,
                "phone" character varying,
                "role" "public"."users_role_enum" NOT NULL DEFAULT 'customer',
                "isActive" boolean NOT NULL DEFAULT true,
                "mustChangePassword" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."events_category_enum" AS ENUM('concert', 'sports', 'other')
        `);
    await queryRunner.query(`
            CREATE TABLE "events" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "title" character varying(200) NOT NULL,
                "description" text NOT NULL,
                "category" "public"."events_category_enum" NOT NULL DEFAULT 'other',
                "eventDate" TIMESTAMP NOT NULL,
                "imageUrl" character varying(500),
                "ticketPrice" numeric(10, 2) NOT NULL,
                "totalTickets" integer NOT NULL,
                "soldTickets" integer NOT NULL DEFAULT '0',
                "availableTickets" integer NOT NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                "isCancelled" boolean NOT NULL DEFAULT false,
                "organizerId" uuid NOT NULL,
                "venueId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                CONSTRAINT "PK_40731c7151fe4be3116e45ddf73" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_3aea230d5fdbdc53ce3bf9091e" ON "events" ("eventDate")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_1024d476207981d1c72232cf3c" ON "events" ("organizerId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_0af7bb0535bc01f3c130cfe5fe" ON "events" ("venueId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_ec9662dd95913f5f43bc7f653a" ON "events" ("category", "eventDate")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_d9372dc38ba10fc5c76e858f52" ON "events" ("organizerId", "eventDate")
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."tickets_status_enum" AS ENUM('valid', 'used', 'cancelled', 'expired')
        `);
    await queryRunner.query(`
            CREATE TABLE "tickets" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "ticketCode" character varying(50) NOT NULL,
                "status" "public"."tickets_status_enum" NOT NULL DEFAULT 'valid',
                "bookingId" uuid NOT NULL,
                "eventId" uuid NOT NULL,
                "userId" uuid NOT NULL,
                "usedAt" TIMESTAMP,
                "usedBy" character varying(255),
                "cancelledAt" TIMESTAMP,
                "cancellationReason" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "booking_id" uuid,
                "event_id" uuid,
                "user_id" uuid,
                CONSTRAINT "UQ_b8bea55b3944f5aeb2219d1627e" UNIQUE ("ticketCode"),
                CONSTRAINT "PK_343bc942ae261cf7a1377f48fd0" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_b8bea55b3944f5aeb2219d1627" ON "tickets" ("ticketCode")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_4bb45e096f521845765f657f5c" ON "tickets" ("userId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_986a0e7a5cc4bddaf417728250" ON "tickets" ("eventId", "status")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_d9fa09991fbba0b7fe45de347c" ON "tickets" ("bookingId", "status")
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."bookings_status_enum" AS ENUM('pending', 'confirmed', 'cancelled', 'failed')
        `);
    await queryRunner.query(`
            CREATE TABLE "bookings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "eventId" uuid NOT NULL,
                "quantity" integer NOT NULL,
                "unitPrice" numeric(10, 2) NOT NULL,
                "subtotal" numeric(10, 2) NOT NULL,
                "serviceFee" numeric(10, 2) NOT NULL DEFAULT '0',
                "total" numeric(10, 2) NOT NULL,
                "status" "public"."bookings_status_enum" NOT NULL DEFAULT 'pending',
                "stripePaymentIntentId" character varying(255),
                "stripeClientSecret" character varying(255),
                "expiresAt" TIMESTAMP,
                "confirmedAt" TIMESTAMP,
                "cancelledAt" TIMESTAMP,
                "cancellationReason" character varying(500),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_38a69a58a323647f2e75eb994d" ON "bookings" ("userId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_f95d476ef16fad91a50544b60c" ON "bookings" ("eventId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_48b267d894e32a25ebde4b207a" ON "bookings" ("status")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_5f63cbb95a5f457f258f055c58" ON "bookings" ("expiresAt")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_7d895a3f015624351717b1ef0a" ON "bookings" ("status", "expiresAt")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_7a361735a32fad64cc5ba05008" ON "bookings" ("eventId", "status")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_be9eb956e205e31b23dd5450b0" ON "bookings" ("userId", "status")
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."payments_status_enum" AS ENUM(
                'pending',
                'succeeded',
                'failed',
                'refunded',
                'cancelled'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "payments" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "stripePaymentIntentId" character varying(255) NOT NULL,
                "bookingId" uuid NOT NULL,
                "userId" uuid NOT NULL,
                "eventId" uuid NOT NULL,
                "amount" integer NOT NULL,
                "currency" character varying(3) NOT NULL DEFAULT 'usd',
                "status" "public"."payments_status_enum" NOT NULL DEFAULT 'pending',
                "stripeMetadata" jsonb,
                "errorMessage" text,
                "errorCode" character varying(100),
                "succeededAt" TIMESTAMP,
                "failedAt" TIMESTAMP,
                "refundedAt" TIMESTAMP,
                "refundedAmount" numeric(10, 2),
                "stripeEventId" character varying(255),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "booking_id" uuid,
                "user_id" uuid,
                "event_id" uuid,
                CONSTRAINT "UQ_57059f281caef51ef1c15adaf35" UNIQUE ("stripePaymentIntentId"),
                CONSTRAINT "UQ_b78118bc8ac312cd42408b80d84" UNIQUE ("stripeEventId"),
                CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_32b41cdb985a296213e9a928b5" ON "payments" ("status")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_3cc6f3e2f26955eaa64fd7f9ea" ON "payments" ("status", "createdAt")
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_57059f281caef51ef1c15adaf3" ON "payments" ("stripePaymentIntentId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_5b901b19ed973dd447a275cdda" ON "payments" ("eventId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_d35cb3c13a18e1ea1705b2817b" ON "payments" ("userId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_1ead3dc5d71db0ea822706e389" ON "payments" ("bookingId")
        `);
    await queryRunner.query(`
            ALTER TABLE "events"
            ADD CONSTRAINT "FK_1024d476207981d1c72232cf3ca" FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "events"
            ADD CONSTRAINT "FK_0af7bb0535bc01f3c130cfe5fe7" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "tickets"
            ADD CONSTRAINT "FK_cc20985f14524969dddd128efd5" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "tickets"
            ADD CONSTRAINT "FK_bd5387c23fb40ae7e3526ad75ea" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "tickets"
            ADD CONSTRAINT "FK_2e445270177206a97921e461710" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "bookings"
            ADD CONSTRAINT "FK_38a69a58a323647f2e75eb994de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "bookings"
            ADD CONSTRAINT "FK_f95d476ef16fad91a50544b60c3" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "payments"
            ADD CONSTRAINT "FK_e86edf76dc2424f123b9023a2b2" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "payments"
            ADD CONSTRAINT "FK_427785468fb7d2733f59e7d7d39" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "payments"
            ADD CONSTRAINT "FK_f08b71380816f776522a404335e" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "payments" DROP CONSTRAINT "FK_f08b71380816f776522a404335e"
        `);
    await queryRunner.query(`
            ALTER TABLE "payments" DROP CONSTRAINT "FK_427785468fb7d2733f59e7d7d39"
        `);
    await queryRunner.query(`
            ALTER TABLE "payments" DROP CONSTRAINT "FK_e86edf76dc2424f123b9023a2b2"
        `);
    await queryRunner.query(`
            ALTER TABLE "bookings" DROP CONSTRAINT "FK_f95d476ef16fad91a50544b60c3"
        `);
    await queryRunner.query(`
            ALTER TABLE "bookings" DROP CONSTRAINT "FK_38a69a58a323647f2e75eb994de"
        `);
    await queryRunner.query(`
            ALTER TABLE "tickets" DROP CONSTRAINT "FK_2e445270177206a97921e461710"
        `);
    await queryRunner.query(`
            ALTER TABLE "tickets" DROP CONSTRAINT "FK_bd5387c23fb40ae7e3526ad75ea"
        `);
    await queryRunner.query(`
            ALTER TABLE "tickets" DROP CONSTRAINT "FK_cc20985f14524969dddd128efd5"
        `);
    await queryRunner.query(`
            ALTER TABLE "events" DROP CONSTRAINT "FK_0af7bb0535bc01f3c130cfe5fe7"
        `);
    await queryRunner.query(`
            ALTER TABLE "events" DROP CONSTRAINT "FK_1024d476207981d1c72232cf3ca"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_1ead3dc5d71db0ea822706e389"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_d35cb3c13a18e1ea1705b2817b"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_5b901b19ed973dd447a275cdda"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_57059f281caef51ef1c15adaf3"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_3cc6f3e2f26955eaa64fd7f9ea"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_32b41cdb985a296213e9a928b5"
        `);
    await queryRunner.query(`
            DROP TABLE "payments"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."payments_status_enum"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_be9eb956e205e31b23dd5450b0"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_7a361735a32fad64cc5ba05008"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_7d895a3f015624351717b1ef0a"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_5f63cbb95a5f457f258f055c58"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_48b267d894e32a25ebde4b207a"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_f95d476ef16fad91a50544b60c"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_38a69a58a323647f2e75eb994d"
        `);
    await queryRunner.query(`
            DROP TABLE "bookings"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."bookings_status_enum"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_d9fa09991fbba0b7fe45de347c"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_986a0e7a5cc4bddaf417728250"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_4bb45e096f521845765f657f5c"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_b8bea55b3944f5aeb2219d1627"
        `);
    await queryRunner.query(`
            DROP TABLE "tickets"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."tickets_status_enum"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_d9372dc38ba10fc5c76e858f52"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_ec9662dd95913f5f43bc7f653a"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_3aea230d5fdbdc53ce3bf9091e"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_0af7bb0535bc01f3c130cfe5fe"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_1024d476207981d1c72232cf3c"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_3aea230d5fdbdc53ce3bf9091e"
        `);
    await queryRunner.query(`
            DROP TABLE "events"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."events_category_enum"
        `);
    await queryRunner.query(`
            DROP TABLE "users"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."users_role_enum"
        `);
    await queryRunner.query(`
            DROP TABLE "venues"
        `);
  }
}
