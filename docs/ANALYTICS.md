# Módulo de Analíticas (Analytics)

## Descripción

El módulo de analíticas proporciona dashboards y estadísticas detalladas para organizadores y administradores. Incluye métricas de ventas, revenue, ocupación de eventos, y actividad de la plataforma.

**Base URL:** `http://localhost:3000/api/v1/analytics`

---

## Endpoints

### 1. Dashboard del Organizador

Obtiene estadísticas y resumen de todos los eventos del organizador autenticado.

**Endpoint:** `GET /analytics/organizer/dashboard`

**Autenticación:** JWT requerido

**Autorización:** `organizador`, `super_admin`

**cURL:**
```bash
curl -X GET http://localhost:3000/api/v1/analytics/organizer/dashboard \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response 200 (OK):**
```json
{
  "summary": {
    "totalEvents": 12,
    "activeEvents": 8,
    "totalTicketsSold": 1450,
    "grossRevenue": 166750.00,
    "netRevenue": 145000.00,
    "platformFees": 21750.00
  },
  "events": [
    {
      "id": "event-uuid-123",
      "title": "Festival Rock 2025",
      "eventDate": "2025-12-31T20:00:00.000Z",
      "totalTickets": 1000,
      "soldTickets": 750,
      "availableTickets": 250,
      "occupancyRate": 75.0,
      "revenue": 86250.00,
      "status": "published"
    }
  ]
}
```

**Métricas del Summary:**
- `totalEvents`: Total de eventos creados por el organizador
- `activeEvents`: Eventos activos (publicados, no cancelados, fecha futura)
- `totalTicketsSold`: Suma de todos los tickets vendidos
- `grossRevenue`: Ingresos brutos (subtotal + serviceFee)
- `netRevenue`: Ingresos netos (subtotal sin serviceFee)
- `platformFees`: Total de tarifas de la plataforma (15%)

**Métricas por Evento:**
- `occupancyRate`: Porcentaje de ocupación (soldTickets / totalTickets × 100)
- `revenue`: Revenue generado por el evento
- `status`: `published` o `cancelled`

---

### 2. Estadísticas de Evento Específico

Obtiene estadísticas detalladas de un evento incluyendo ventas, revenue y ocupación.

**Endpoint:** `GET /analytics/events/:id/stats`

**Autenticación:** JWT requerido

**Autorización:** Owner del evento, `admin`, `super_admin`

**cURL:**
```bash
curl -X GET http://localhost:3000/api/v1/analytics/events/event-uuid-123/stats \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response 200 (OK):**
```json
{
  "event": {
    "id": "event-uuid-123",
    "title": "Festival Rock 2025",
    "eventDate": "2025-12-31T20:00:00.000Z"
  },
  "stats": {
    "totalTickets": 1000,
    "soldTickets": 750,
    "availableTickets": 250,
    "occupancyRate": 75.0,
    "grossRevenue": 86250.00,
    "serviceFees": 12937.50,
    "netRevenue": 73312.50,
    "averageTicketPrice": 115.00,
    "totalBookings": 375,
    "averageTicketsPerBooking": 2.0
  },
  "salesOverTime": [
    {
      "date": "2025-01-15",
      "ticketsSold": 120,
      "revenue": 13800.00
    },
    {
      "date": "2025-01-16",
      "ticketsSold": 95,
      "revenue": 10925.00
    }
  ]
}
```

**Métricas Detalladas:**
- `occupancyRate`: % de tickets vendidos
- `grossRevenue`: Total cobrado a clientes (incluye serviceFee)
- `serviceFees`: Total de tarifas de plataforma
- `netRevenue`: Ingresos netos del organizador
- `averageTicketPrice`: Precio promedio por ticket (grossRevenue / soldTickets)
- `totalBookings`: Número total de reservas confirmadas
- `averageTicketsPerBooking`: Promedio de tickets por reserva
- `salesOverTime`: Ventas agrupadas por día

**Response 403 (Forbidden):**
```json
{
  "statusCode": 403,
  "message": "No tienes permiso para ver las estadísticas de este evento",
  "error": "Forbidden"
}
```

**Response 404 (Not Found):**
```json
{
  "statusCode": 404,
  "message": "Evento no encontrado",
  "error": "Not Found"
}
```

---

### 3. Dashboard de Administrador

Obtiene estadísticas globales de la plataforma incluyendo usuarios, eventos, revenue total, top eventos y organizadores.

**Endpoint:** `GET /analytics/admin/dashboard`

**Autenticación:** JWT requerido

**Autorización:** `admin`, `super_admin`

**cURL:**
```bash
curl -X GET http://localhost:3000/api/v1/analytics/admin/dashboard \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response 200 (OK):**
```json
{
  "summary": {
    "totalUsers": 15420,
    "totalCustomers": 13850,
    "totalOrganizers": 1520,
    "totalAdmins": 50,
    "totalEvents": 3250,
    "activeEvents": 1890,
    "totalTicketsSold": 125000,
    "grossRevenue": 14375000.00,
    "platformRevenue": 2156250.00
  },
  "topEvents": [
    {
      "id": "event-uuid-123",
      "title": "Festival Rock 2025",
      "soldTickets": 5000,
      "revenue": 575000.00
    },
    {
      "id": "event-uuid-456",
      "title": "Concierto Pop Internacional",
      "soldTickets": 3500,
      "revenue": 402500.00
    }
  ],
  "topOrganizers": [
    {
      "id": "organizer-uuid-123",
      "name": "Juan Pérez",
      "totalEvents": 45,
      "totalRevenue": 1725000.00
    },
    {
      "id": "organizer-uuid-456",
      "name": "María García",
      "totalEvents": 38,
      "totalRevenue": 1380000.00
    }
  ],
  "recentActivity": [
    {
      "type": "booking",
      "description": "Carlos compró 4 tickets para Festival Rock 2025",
      "timestamp": "2025-01-28T18:35:00.000Z"
    },
    {
      "type": "booking",
      "description": "Ana compró 2 tickets para Concierto Pop Internacional",
      "timestamp": "2025-01-28T18:30:00.000Z"
    }
  ]
}
```

**Secciones del Dashboard:**

1. **Summary**: Métricas globales de la plataforma
   - `platformRevenue`: Total de tarifas de servicio cobradas (15%)
   - Usuarios por rol: customers, organizers, admins

2. **Top Events**: Top 5 eventos por revenue
   - Ordenados por ingresos generados

3. **Top Organizers**: Top 5 organizadores por revenue
   - Incluye número de eventos y revenue total

4. **Recent Activity**: Últimas 10 reservas confirmadas
   - Actividad en tiempo real de la plataforma

---

## Cálculos de Revenue

### Desglose de Precios

Para un ticket de $100:

| Concepto | Monto | Descripción |
|----------|-------|-------------|
| Unit Price | $100.00 | Precio base del ticket |
| Quantity | 2 | Cantidad de tickets |
| **Subtotal** | **$200.00** | unitPrice × quantity |
| Service Fee (15%) | $30.00 | 15% del subtotal |
| **Total** | **$230.00** | subtotal + serviceFee |

### Revenue del Organizador

```
Gross Revenue = Total cobrado al cliente = $230.00
Platform Fee = Service Fee = $30.00
Net Revenue = Gross Revenue - Platform Fee = $200.00
```

### Revenue de la Plataforma

```
Platform Revenue = Suma de todos los serviceFees = 15% de todas las ventas
```

---

## Casos de Uso

### 1. Organizador Revisa Performance

```bash
# Ver dashboard general
curl -X GET http://localhost:3000/api/v1/analytics/organizer/dashboard \
  -H "Authorization: Bearer $TOKEN"

# Ver estadísticas de un evento específico
curl -X GET http://localhost:3000/api/v1/analytics/events/$EVENT_ID/stats \
  -H "Authorization: Bearer $TOKEN"
```

**Métricas Clave para Organizador:**
- Occupancy Rate: ¿Qué tan lleno está mi evento?
- Average Ticket Price: ¿Cuál es mi precio promedio?
- Sales Over Time: ¿Cómo van las ventas día a día?
- Net Revenue: ¿Cuánto voy a recibir?

### 2. Admin Monitorea la Plataforma

```bash
# Ver dashboard global
curl -X GET http://localhost:3000/api/v1/analytics/admin/dashboard \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Métricas Clave para Admin:**
- Platform Revenue: Ingresos de la plataforma
- Active Events: Eventos activos en la plataforma
- Total Tickets Sold: Volumen de ventas
- Top Performers: Mejores eventos y organizadores

---

## Permisos y Acceso

| Endpoint | Cliente | Organizador | Admin | Super Admin |
|----------|---------|-------------|-------|-------------|
| GET /organizer/dashboard | ❌ | ✅ (sus eventos) | ❌ | ✅ (todos) |
| GET /events/:id/stats | ❌ | ✅ (sus eventos) | ✅ | ✅ |
| GET /admin/dashboard | ❌ | ❌ | ✅ | ✅ |

---

## Filtros y Consideraciones

### Eventos Activos

Un evento se considera **activo** si cumple:
- `isActive === true`
- `isCancelled === false`
- `eventDate > new Date()` (fecha futura)

### Reservas Contabilizadas

Solo se cuentan reservas que:
- `status === 'confirmado'`
- Tienen un pago con `status === 'succeeded'`

Esto asegura que solo se contabilicen ventas reales y pagadas.

---

## Códigos de Error HTTP

| Código | Descripción |
|--------|-------------|
| 200 | OK - Dashboard obtenido exitosamente |
| 401 | Unauthorized - Token inválido o ausente |
| 403 | Forbidden - Sin permisos para ver dashboard |
| 404 | Not Found - Evento no encontrado |
| 500 | Internal Server Error - Error del servidor |

---

## Notas Importantes

- **Caché**: Los dashboards pueden implementar caché de 5 minutos para mejorar performance
- **Timezone**: Todas las fechas están en UTC
- **Moneda**: Los montos están en la moneda configurada (USD por defecto)
- **Precisión**: Los montos se redondean a 2 decimales
- **Performance**: Los dashboards ejecutan múltiples queries, optimizados con joins

---

## Ejemplos Completos

### Dashboard de Organizador con Análisis

```javascript
// Obtener dashboard
const response = await fetch('/api/v1/analytics/organizer/dashboard', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const dashboard = await response.json();

// Analizar métricas
console.log(`Total Events: ${dashboard.summary.totalEvents}`);
console.log(`Net Revenue: $${dashboard.summary.netRevenue}`);
console.log(`Platform Fees: $${dashboard.summary.platformFees}`);

// Eventos con mejor performance
const topEvent = dashboard.events
  .sort((a, b) => b.occupancyRate - a.occupancyRate)[0];

console.log(`Best Event: ${topEvent.title}`);
console.log(`Occupancy: ${topEvent.occupancyRate}%`);
```

### Estadísticas Detalladas de Evento

```javascript
// Obtener stats del evento
const stats = await fetch(`/api/v1/analytics/events/${eventId}/stats`, {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

// Analizar ventas por día
console.log('Ventas Diarias:');
stats.salesOverTime.forEach(day => {
  console.log(`${day.date}: ${day.ticketsSold} tickets, $${day.revenue}`);
});

// KPIs
console.log(`\nKPIs:`);
console.log(`Occupancy Rate: ${stats.stats.occupancyRate}%`);
console.log(`Avg Ticket Price: $${stats.stats.averageTicketPrice}`);
console.log(`Avg Tickets/Booking: ${stats.stats.averageTicketsPerBooking}`);
```

---

## Recursos Adicionales

- [Dashboard de Organizador](AUTH.md#dashboard-de-organizador)
- [Gestión de Eventos](EVENTS.md)
- [Cálculo de Precios](BOOKINGS.md#cálculo-de-precios)
