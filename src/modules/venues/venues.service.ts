import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Venue } from './entities/venue.entity';
import { CreateVenueDto } from './dto/create-venue.dto';
import { QueryVenuesDto } from './dto/query-venues.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class VenuesService {
  private readonly logger = new Logger(VenuesService.name);

  constructor(
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
  ) {}

  /**
   * Crea un nuevo recinto
   * @param createVenueDto - Datos del recinto a crear
   * @returns El recinto creado
   */
  async create(createVenueDto: CreateVenueDto): Promise<Venue> {
    this.logger.log(`Creating venue: ${createVenueDto.name}`);

    const venue = this.venueRepository.create(createVenueDto);
    const savedVenue = await this.venueRepository.save(venue);

    this.logger.log(`Venue created successfully with ID: ${savedVenue.id}`);
    return savedVenue;
  }

  /**
   * Lista todos los recintos con paginación y filtros
   * @param queryVenuesDto - Parámetros de consulta (paginación, filtros)
   * @returns Resultado paginado de recintos
   */
  async findAllWithFilters(queryVenuesDto: QueryVenuesDto): Promise<PaginatedResult<Venue>> {
    const {
      page = 1,
      limit = 50,
      city,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = queryVenuesDto;

    this.logger.log(
      `Fetching venues with filters: page=${page}, limit=${limit}, city=${city}, search=${search}`,
    );

    const skip = (page - 1) * limit;

    // Construir las condiciones where
    const where: any = {};

    if (city) {
      where.city = city;
    }

    if (search) {
      where.name = Like(`%${search}%`);
    }

    // Realizar la consulta con paginación
    const [venues, total] = await this.venueRepository.findAndCount({
      where,
      order: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    this.logger.log(`Found ${total} venues, returning page ${page} of ${totalPages}`);

    return {
      data: venues,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Obtiene un recinto por su ID
   * @param id - ID del recinto
   * @returns El recinto encontrado
   * @throws NotFoundException si el recinto no existe
   */
  async findOne(id: string): Promise<Venue> {
    this.logger.log(`Fetching venue with ID: ${id}`);

    const venue = await this.venueRepository.findOne({
      where: { id },
    });

    if (!venue) {
      this.logger.warn(`Venue with ID ${id} not found`);
      throw new NotFoundException('Venue not found');
    }

    this.logger.log(`Venue found: ${venue.name}`);
    return venue;
  }
}
