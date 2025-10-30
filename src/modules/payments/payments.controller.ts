import {
  Controller,
  Post,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentIntentResponseDto } from './dto/payment-intent-response.dto';
import { WebhookResponseDto } from './dto/webhook-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-intent')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENTE, UserRole.ORGANIZADOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Crear Payment Intent en Stripe',
    description:
      'Crea un Payment Intent en Stripe para procesar el pago de una reserva. Valida que la reserva esté pendiente, no haya expirado y que el usuario sea el owner.',
  })
  @ApiBody({ type: CreatePaymentIntentDto })
  @ApiResponse({
    status: 200,
    description: 'Payment Intent creado exitosamente',
    type: PaymentIntentResponseDto,
    schema: {
      example: {
        clientSecret: 'pi_1234567890_secret_abcdefghijk',
        amount: 11500,
        currency: 'usd',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Booking expirado o ya confirmado',
    schema: {
      example: {
        statusCode: 400,
        message: ['La reserva ha expirado', 'La reserva ya fue procesada con estado: confirmed'],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'No es el owner del booking',
    schema: {
      example: {
        statusCode: 403,
        message: 'No tienes permiso para pagar esta reserva',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Booking no encontrado',
    schema: {
      example: {
        statusCode: 404,
        message: 'Reserva no encontrada',
        error: 'Not Found',
      },
    },
  })
  async createIntent(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
    @CurrentUser('userId') userId: string,
  ): Promise<PaymentIntentResponseDto> {
    return this.paymentsService.createIntent(createPaymentIntentDto, userId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // No mostrar en Swagger (endpoint interno de Stripe)
  @ApiOperation({
    summary: 'Webhook de Stripe',
    description:
      'Endpoint llamado por Stripe cuando ocurre un evento de pago. Valida la signature y procesa el evento de forma idempotente.',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook procesado correctamente',
    type: WebhookResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Signature inválida o amount mismatch',
    schema: {
      example: {
        statusCode: 400,
        message: ['Signature inválida', 'Amount mismatch'],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Booking no encontrado',
    schema: {
      example: {
        statusCode: 404,
        message: 'Reserva no encontrada',
        error: 'Not Found',
      },
    },
  })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ): Promise<WebhookResponseDto> {
    // El raw body es necesario para validar la signature de Stripe
    const rawBody = request.rawBody;

    if (!rawBody) {
      throw new Error('Raw body is required for Stripe webhook validation');
    }

    return this.paymentsService.handleWebhook(signature, rawBody);
  }
}
