import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CheckerAssignment } from './entities/checker-assignment.entity';
import { CreateCheckerAssignmentDto } from './dto/create-checker-assignment.dto';
import { UpdateCheckerAssignmentDto } from './dto/update-checker-assignment.dto';
import { QueryCheckerAssignmentDto } from './dto/query-checker-assignment.dto';
import { User } from '../users/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { Venue } from '../venues/entities/venue.entity';
import { UserRole } from '../users/enums/user-role.enum';

@Injectable()
export class CheckerAssignmentsService {
  constructor(
    @InjectRepository(CheckerAssignment)
    private readonly assignmentRepository: Repository<CheckerAssignment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
  ) {}

  /**
   * Crea múltiples asignaciones para un CHECKER con uno o más recintos y eventos
   */
  async createAssignments(
    createDto: CreateCheckerAssignmentDto,
    assignedByUserId: string,
  ): Promise<CheckerAssignment[]> {
    const { checkerId, venueIds, eventIds } = createDto;

    // Validar que el usuario es un CHECKER
    const checker = await this.userRepository.findOne({
      where: { id: checkerId },
    });

    if (!checker) {
      throw new NotFoundException(`Usuario con ID ${checkerId} no encontrado`);
    }

    if (checker.role !== UserRole.CHECKER) {
      throw new BadRequestException(
        `El usuario debe tener rol CHECKER para recibir asignaciones`,
      );
    }

    if (!checker.isActive) {
      throw new BadRequestException(
        `El usuario CHECKER debe estar activo para recibir asignaciones`,
      );
    }

    // Validar que todos los recintos existen
    const venues = await this.venueRepository.find({
      where: { id: In(venueIds) },
    });

    if (venues.length !== venueIds.length) {
      throw new NotFoundException(
        `Uno o más recintos no fueron encontrados`,
      );
    }

    // Validar que todos los eventos existen y están activos
    const events = await this.eventRepository.find({
      where: { id: In(eventIds), isActive: true },
    });

    if (events.length !== eventIds.length) {
      throw new NotFoundException(
        `Uno o más eventos no fueron encontrados o no están activos`,
      );
    }

    // Verificar si ya existen asignaciones duplicadas
    const existingAssignments = await this.assignmentRepository.find({
      where: {
        checkerId,
        venueId: In(venueIds),
        eventId: In(eventIds),
      },
    });

    if (existingAssignments.length > 0) {
      const duplicates = existingAssignments
        .map((a) => `Recinto: ${a.venueId}, Evento: ${a.eventId}`)
        .join('; ');
      throw new ConflictException(
        `Ya existen las siguientes asignaciones: ${duplicates}`,
      );
    }

    // Crear todas las combinaciones de asignaciones (producto cartesiano)
    const assignments: CheckerAssignment[] = [];

    for (const venueId of venueIds) {
      for (const eventId of eventIds) {
        const assignment = this.assignmentRepository.create({
          checkerId,
          venueId,
          eventId,
          assignedBy: assignedByUserId,
          isActive: true,
        });
        assignments.push(assignment);
      }
    }

    // Guardar todas las asignaciones
    return await this.assignmentRepository.save(assignments);
  }

  /**
   * Obtiene todas las asignaciones con filtros opcionales
   */
  async findAll(
    queryDto: QueryCheckerAssignmentDto,
  ): Promise<CheckerAssignment[]> {
    const { checkerId, venueId, eventId, isActive } = queryDto;

    const where: any = {};

    if (checkerId) where.checkerId = checkerId;
    if (venueId) where.venueId = venueId;
    if (eventId) where.eventId = eventId;
    if (isActive !== undefined) where.isActive = isActive;

    return await this.assignmentRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtiene una asignación por ID
   */
  async findOne(id: string): Promise<CheckerAssignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException(`Asignación con ID ${id} no encontrada`);
    }

    return assignment;
  }

  /**
   * Obtiene todas las asignaciones de un CHECKER específico
   */
  async findByChecker(checkerId: string): Promise<CheckerAssignment[]> {
    const checker = await this.userRepository.findOne({
      where: { id: checkerId },
    });

    if (!checker) {
      throw new NotFoundException(`Usuario con ID ${checkerId} no encontrado`);
    }

    return await this.assignmentRepository.find({
      where: { checkerId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Actualiza las asignaciones de un CHECKER (reemplaza las existentes)
   */
  async updateAssignments(
    checkerId: string,
    updateDto: UpdateCheckerAssignmentDto,
    assignedByUserId: string,
  ): Promise<CheckerAssignment[]> {
    const { venueIds, eventIds } = updateDto;

    // Validar que el usuario es un CHECKER
    const checker = await this.userRepository.findOne({
      where: { id: checkerId },
    });

    if (!checker) {
      throw new NotFoundException(`Usuario con ID ${checkerId} no encontrado`);
    }

    if (checker.role !== UserRole.CHECKER) {
      throw new BadRequestException(
        `El usuario debe tener rol CHECKER para actualizar asignaciones`,
      );
    }

    // Desactivar todas las asignaciones actuales del checker
    await this.assignmentRepository.update(
      { checkerId, isActive: true },
      { isActive: false },
    );

    // Si se proporcionaron nuevos venues o events, crear nuevas asignaciones
    if (venueIds && eventIds) {
      // Validar venues
      const venues = await this.venueRepository.find({
        where: { id: In(venueIds) },
      });

      if (venues.length !== venueIds.length) {
        throw new NotFoundException(
          `Uno o más recintos no fueron encontrados`,
        );
      }

      // Validar eventos
      const events = await this.eventRepository.find({
        where: { id: In(eventIds), isActive: true },
      });

      if (events.length !== eventIds.length) {
        throw new NotFoundException(
          `Uno o más eventos no fueron encontrados o no están activos`,
        );
      }

      // Crear nuevas asignaciones
      const assignments: CheckerAssignment[] = [];

      for (const venueId of venueIds) {
        for (const eventId of eventIds) {
          const assignment = this.assignmentRepository.create({
            checkerId,
            venueId,
            eventId,
            assignedBy: assignedByUserId,
            isActive: true,
          });
          assignments.push(assignment);
        }
      }

      return await this.assignmentRepository.save(assignments);
    }

    return await this.findByChecker(checkerId);
  }

  /**
   * Elimina una asignación específica (soft delete - marca como inactiva)
   */
  async removeAssignment(id: string): Promise<void> {
    const assignment = await this.findOne(id);

    await this.assignmentRepository.update(
      { id: assignment.id },
      { isActive: false },
    );
  }

  /**
   * Elimina todas las asignaciones de un CHECKER
   */
  async removeAllAssignmentsForChecker(checkerId: string): Promise<void> {
    const checker = await this.userRepository.findOne({
      where: { id: checkerId },
    });

    if (!checker) {
      throw new NotFoundException(`Usuario con ID ${checkerId} no encontrado`);
    }

    await this.assignmentRepository.update(
      { checkerId, isActive: true },
      { isActive: false },
    );
  }

  /**
   * Reactiva una asignación específica
   */
  async activateAssignment(id: string): Promise<CheckerAssignment> {
    const assignment = await this.findOne(id);

    assignment.isActive = true;
    return await this.assignmentRepository.save(assignment);
  }

  /**
   * Obtiene los detalles completos de los eventos y recintos asignados a un CHECKER
   */
  async getCheckerAssignmentsWithDetails(checkerId: string) {
    const checker = await this.userRepository.findOne({
      where: { id: checkerId },
    });

    if (!checker) {
      throw new NotFoundException(`Usuario con ID ${checkerId} no encontrado`);
    }

    const assignments = await this.assignmentRepository.find({
      where: { checkerId, isActive: true },
      relations: ['event', 'venue', 'event.venue'],
      order: { createdAt: 'DESC' },
    });

    // Agrupar por evento
    const eventMap = new Map();

    for (const assignment of assignments) {
      const eventId = assignment.eventId;

      if (!eventMap.has(eventId)) {
        eventMap.set(eventId, {
          event: {
            id: assignment.event.id,
            title: assignment.event.title,
            description: assignment.event.description,
            category: assignment.event.category,
            eventDate: assignment.event.eventDate,
            ticketPrice: assignment.event.ticketPrice,
            totalTickets: assignment.event.totalTickets,
            soldTickets: assignment.event.soldTickets,
            availableTickets: assignment.event.availableTickets,
            isActive: assignment.event.isActive,
            isCancelled: assignment.event.isCancelled,
            imageUrl: assignment.event.imageUrl,
          },
          venues: [],
        });
      }

      const eventData = eventMap.get(eventId);
      eventData.venues.push({
        id: assignment.venue.id,
        name: assignment.venue.name,
        address: assignment.venue.address,
        city: assignment.venue.city,
        country: assignment.venue.country,
        capacity: assignment.venue.capacity,
        assignmentId: assignment.id,
        assignedAt: assignment.createdAt,
      });
    }

    return {
      checkerId,
      checkerName: `${checker.firstName || ''} ${checker.lastName || ''}`.trim(),
      checkerEmail: checker.email,
      totalAssignments: assignments.length,
      assignments: Array.from(eventMap.values()),
    };
  }
}
