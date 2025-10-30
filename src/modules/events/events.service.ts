import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Event } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { Venue } from '../venues/entities/venue.entity';
import { UserRole } from '../users/enums/user-role.enum';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
  ) {}

  /**
   * Crear un nuevo evento
   * Validaciones:
   * - La fecha del evento debe ser en el futuro
   * - El recinto debe existir
   * - totalTickets no debe exceder la capacidad del recinto
   * - El organizador es el usuario autenticado
   */
  async create(createEventDto: CreateEventDto, organizerId: string): Promise<Event> {
    // Validar que la fecha sea en el futuro
    const eventDate = new Date(createEventDto.eventDate);
    const now = new Date();

    if (eventDate <= now) {
      throw new BadRequestException('La fecha del evento debe ser en el futuro');
    }

    // Verificar que el recinto existe
    const venue = await this.venueRepository.findOne({
      where: { id: createEventDto.venueId },
    });

    if (!venue) {
      throw new NotFoundException('Recinto no encontrado');
    }

    // Validar que totalTickets no exceda la capacidad del recinto
    if (createEventDto.totalTickets > venue.capacity) {
      throw new BadRequestException(
        `La cantidad de boletos (${createEventDto.totalTickets}) excede la capacidad del recinto (${venue.capacity})`,
      );
    }

    // Crear el evento
    const event = this.eventRepository.create({
      ...createEventDto,
      eventDate,
      organizerId,
      soldTickets: 0,
      availableTickets: createEventDto.totalTickets, // Inicialmente todos disponibles
      isActive: true,
      isCancelled: false,
    });

    return this.eventRepository.save(event);
  }

  /**
   * Listar eventos con filtros y paginación
   * - Por defecto solo muestra eventos activos y no cancelados
   * - Soporta filtrado por categoría, ciudad, búsqueda por título, organizador
   */
  async findAllWithFilters(queryEventsDto: QueryEventsDto): Promise<PaginatedResult<Event>> {
    const {
      page = 1,
      limit = 50,
      category,
      search,
      organizerId,
      city,
      sortBy = 'eventDate',
      sortOrder = 'ASC',
    } = queryEventsDto;

    const queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.venue', 'venue')
      .leftJoinAndSelect('event.organizer', 'organizer')
      .where('event.isActive = :isActive', { isActive: true })
      .andWhere('event.isCancelled = :isCancelled', { isCancelled: false });

    // Filtro por categoría
    if (category) {
      queryBuilder.andWhere('event.category = :category', { category });
    }

    // Filtro por organizador
    if (organizerId) {
      queryBuilder.andWhere('event.organizerId = :organizerId', {
        organizerId,
      });
    }

    // Búsqueda por título
    if (search) {
      queryBuilder.andWhere('event.title LIKE :search', {
        search: `%${search}%`,
      });
    }

    // Filtro por ciudad del recinto
    if (city) {
      queryBuilder.andWhere('venue.city = :city', { city });
    }

    // Ordenamiento
    queryBuilder.orderBy(`event.${sortBy}`, sortOrder);

    // Paginación
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [events, total] = await queryBuilder.getManyAndCount();

    return {
      data: events,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Obtener un evento por ID
   */
  async findOne(id: string): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['venue', 'organizer'],
    });

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    return event;
  }

  /**
   * Listar eventos del organizador autenticado
   */
  async findMyEvents(
    organizerId: string,
    queryEventsDto: QueryEventsDto,
  ): Promise<PaginatedResult<Event>> {
    return this.findAllWithFilters({
      ...queryEventsDto,
      organizerId,
    });
  }

  /**
   * Actualizar un evento
   * Validaciones:
   * - Solo el organizador propietario o super_admin pueden actualizar
   * - No se puede actualizar si el evento ya pasó
   * - No se puede actualizar si el evento está cancelado
   * - Si se actualiza la fecha, debe ser futura
   * - Si se actualiza totalTickets, no debe exceder capacidad del recinto
   */
  async update(
    id: string,
    updateEventDto: UpdateEventDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Event> {
    const event = await this.findOne(id);

    // Verificar permisos: solo el organizador propietario o super_admin
    if (event.organizerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('No tienes permiso para actualizar este evento');
    }

    // No se puede actualizar un evento que ya pasó
    if (event.eventDate < new Date()) {
      throw new BadRequestException('No se puede actualizar un evento que ya finalizó');
    }

    // No se puede actualizar un evento cancelado
    if (event.isCancelled) {
      throw new BadRequestException('No se puede actualizar un evento cancelado');
    }

    // Si se actualiza la fecha, validar que sea futura
    if (updateEventDto.eventDate) {
      const newEventDate = new Date(updateEventDto.eventDate);
      if (newEventDate <= new Date()) {
        throw new BadRequestException('La nueva fecha del evento debe ser en el futuro');
      }
    }

    // Si se actualiza totalTickets, validar que no exceda capacidad del recinto
    if (updateEventDto.totalTickets !== undefined) {
      if (updateEventDto.totalTickets > event.venue.capacity) {
        throw new BadRequestException(
          `La cantidad de boletos (${updateEventDto.totalTickets}) excede la capacidad del recinto (${event.venue.capacity})`,
        );
      }

      // No se puede reducir totalTickets por debajo de los boletos ya vendidos
      if (updateEventDto.totalTickets < event.soldTickets) {
        throw new BadRequestException(
          `No se puede reducir la cantidad de boletos (${updateEventDto.totalTickets}) por debajo de los boletos ya vendidos (${event.soldTickets})`,
        );
      }
    }

    // Aplicar actualizaciones
    Object.assign(event, updateEventDto);

    if (updateEventDto.eventDate) {
      event.eventDate = new Date(updateEventDto.eventDate);
    }

    return this.eventRepository.save(event);
  }

  /**
   * Cancelar un evento
   * - Solo el organizador propietario o super_admin pueden cancelar
   * - No se puede cancelar un evento que ya pasó
   * - No se puede cancelar un evento ya cancelado
   */
  async cancel(id: string, userId: string, userRole: UserRole): Promise<Event> {
    const event = await this.findOne(id);

    // Verificar permisos
    if (event.organizerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('No tienes permiso para cancelar este evento');
    }

    // No se puede cancelar un evento que ya pasó
    if (event.eventDate < new Date()) {
      throw new BadRequestException('No se puede cancelar un evento que ya finalizó');
    }

    // Verificar si ya está cancelado
    if (event.isCancelled) {
      throw new BadRequestException('El evento ya está cancelado');
    }

    // Marcar como cancelado
    event.isCancelled = true;
    event.isActive = false;

    return this.eventRepository.save(event);
  }
}
