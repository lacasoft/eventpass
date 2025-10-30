import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { QueryVenuesDto } from './dto/query-venues.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { Venue } from './entities/venue.entity';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@ApiTags('Venues')
@ApiBearerAuth()
@Controller('venues')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Post()
  @Roles(UserRole.ORGANIZADOR, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo recinto' })
  @ApiBody({ type: CreateVenueDto })
  @ApiResponse({
    status: 201,
    description: 'Recinto creado exitosamente',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Teatro Municipal de Santiago',
        address: 'Agustinas 794, Santiago Centro',
        city: 'Santiago',
        country: 'CL',
        capacity: 1500,
        createdAt: '2025-01-20T10:30:00.000Z',
        updatedAt: '2025-01-20T10:30:00.000Z',
        deletedAt: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validación fallida',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'El nombre es requerido',
          'La capacidad debe ser mayor a 0',
          'El código de país debe ser un código ISO 3166-1 alpha-2 válido (2 letras mayúsculas)',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Requiere rol organizer o super_admin',
    schema: {
      example: {
        statusCode: 403,
        message:
          "User role 'cliente' does not have permission to access this resource. Required roles: organizer, super_admin",
        error: 'Forbidden',
      },
    },
  })
  async create(@Body() createVenueDto: CreateVenueDto): Promise<Venue> {
    return this.venuesService.create(createVenueDto);
  }

  @Get()
  @Roles(UserRole.ORGANIZADOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar todos los recintos con paginación y filtros' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'city', required: false, type: String, example: 'Santiago' })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'Teatro' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], example: 'DESC' })
  @ApiResponse({
    status: 200,
    description: 'Lista de recintos',
    schema: {
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Auditorio Nacional',
            address: 'Paseo de la Reforma 50',
            city: 'Ciudad de México',
            country: 'MX',
            capacity: 10000,
            createdAt: '2025-01-20T10:30:00.000Z',
            updatedAt: '2025-01-20T10:30:00.000Z',
            deletedAt: null,
          },
        ],
        meta: {
          page: 1,
          limit: 50,
          total: 25,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Requiere rol organizer, admin o super_admin',
    schema: {
      example: {
        statusCode: 403,
        message:
          "User role 'cliente' does not have permission to access this resource. Required roles: organizer, admin, super_admin",
        error: 'Forbidden',
      },
    },
  })
  async findAll(@Query() queryVenuesDto: QueryVenuesDto): Promise<PaginatedResult<Venue>> {
    return this.venuesService.findAllWithFilters(queryVenuesDto);
  }

  @Get(':id')
  @Roles(UserRole.ORGANIZADOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener detalle de un recinto por ID' })
  @ApiResponse({
    status: 200,
    description: 'Recinto encontrado',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Teatro Municipal de Santiago',
        address: 'Agustinas 794, Santiago Centro',
        city: 'Santiago',
        country: 'CL',
        capacity: 1500,
        createdAt: '2025-01-20T10:30:00.000Z',
        updatedAt: '2025-01-20T10:30:00.000Z',
        deletedAt: null,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Recinto no encontrado',
    schema: {
      example: {
        statusCode: 404,
        message: 'Venue not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Requiere rol organizer, admin o super_admin',
    schema: {
      example: {
        statusCode: 403,
        message:
          "User role 'cliente' does not have permission to access this resource. Required roles: organizer, admin, super_admin",
        error: 'Forbidden',
      },
    },
  })
  async findOne(@Param('id') id: string): Promise<Venue> {
    return this.venuesService.findOne(id);
  }
}
