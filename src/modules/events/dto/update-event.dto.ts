import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateEventDto } from './create-event.dto';

// UpdateEventDto permite actualizar todos los campos excepto venueId
// El venue no se puede cambiar después de crear el evento
export class UpdateEventDto extends PartialType(OmitType(CreateEventDto, ['venueId'] as const)) {}
