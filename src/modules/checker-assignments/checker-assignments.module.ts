import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckerAssignmentsController } from './checker-assignments.controller';
import { CheckerAssignmentsService } from './checker-assignments.service';
import { CheckerAssignment } from './entities/checker-assignment.entity';
import { User } from '../users/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { Venue } from '../venues/entities/venue.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CheckerAssignment, User, Event, Venue]),
  ],
  controllers: [CheckerAssignmentsController],
  providers: [CheckerAssignmentsService],
  exports: [CheckerAssignmentsService],
})
export class CheckerAssignmentsModule {}
