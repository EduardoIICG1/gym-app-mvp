# Roadmap competitivo y productización SaaS

Fecha: 2026-06-15  
Proyecto: Gym App / Primary Performance  
Benchmark principal: GymHub

## 1. Decisión estratégica

GymHub se adopta como benchmark directo de operatividad, alcance comercial y precio para gimnasios chilenos.

La meta no es copiar cada función de inmediato ni abandonar la especialización construida para Primary Performance. La meta es:

1. alcanzar paridad funcional en la operación general que un gimnasio espera;
2. mantener una suscripción de entrada cercana a $35.000 CLP mensuales;
3. diferenciar el producto mediante entrenamiento personalizado, kinesiología y control detallado de sesiones;
4. convertir la aplicación de Primary en una plataforma multi-gimnasio preparada para captar clientes del sur de Chile.

## 2. Realidad comercial validada

### Sensibilidad al precio

En Puerto Montt y otras ciudades del sur existe una alta sensibilidad al precio tanto entre alumnos como entre propietarios de gimnasios. Esto afecta:

- la disposición a pagar por entrenamiento personalizado;
- la valoración del trabajo profesional;
- la inversión del gimnasio en software y operación;
- la percepción de una mensualidad tecnológica de $90.000 CLP.

La misma objeción que recibe un coach —"es caro" aunque exista dedicación y valor profesional— puede aparecer cuando el gimnasio evalúa una plataforma. El producto debe demostrar retorno operativo de forma concreta y, al mismo tiempo, reducir la barrera de entrada.

### Corrección de criterio de precio

$90.000 CLP mensuales puede ser bajo frente al costo de desarrollar y mantener software personalizado, pero **no es bajo como suscripción SaaS estándar para un gimnasio pequeño o mediano de Puerto Montt**.

Por lo tanto:

- Primary no debe financiar por sí solo el desarrollo completo del producto;
- la inversión debe distribuirse entre múltiples gimnasios;
- el precio de entrada debe competir con alternativas como GymHub;
- los planes cercanos a $90.000 deben reservarse para soporte gestionado, integraciones, multi-sucursal o módulos avanzados.

## 3. Posicionamiento del producto

### Promesa central

> Una plataforma operativa para gimnasios del sur de Chile que gestiona miembros, membresías, agenda, reservas, asistencia y pagos, con módulos avanzados de entrenamiento personalizado y kinesiología.

### Segmento inicial

- Gimnasios boutique.
- Centros de entrenamiento personalizado.
- Estudios funcionales.
- Centros que mezclan gimnasio y kinesiología.
- Gimnasios pequeños y medianos que hoy operan con Excel, WhatsApp, cuadernos o herramientas separadas.

### Diferenciadores propios

- Un motor único para `GROUP`, `PERSONAL_TRAINING` y `KINESIOLOGY`.
- Membresías y consumo de sesiones por tipo de servicio.
- Propuestas y confirmaciones de horarios para PT/KINE.
- Ficha clínica, SOAP y restricciones operativas.
- Permisos separados para ADMIN, COACH, KINESIOLOGIST y MEMBER.
- Adaptación al funcionamiento real de gimnasios regionales.

## 4. Principios de producto

1. **Paridad antes que adornos:** primero cubrir la operación general que GymHub ya resuelve.
2. **Mobile-first real:** admin, coach y miembro deben operar desde el teléfono.
3. **Configuración, no desarrollo por cliente:** ningún gimnasio debe requerir una rama o versión propia.
4. **Multi-tenant compartido:** una sola plataforma e infraestructura para todos los gimnasios.
5. **Módulos activables:** Health, pagos, check-in, automatizaciones y analítica pueden habilitarse por plan.
6. **Precio accesible, alcance controlado:** una suscripción baja no incluye personalización ilimitada.
7. **Primary como cliente fundador:** aporta validación y feedback, pero no financia todo el producto.
8. **No copiar sin criterio:** las funciones de GymHub se priorizan según impacto operativo y comercial.

## 5. Arquitectura objetivo de bajo costo

La plataforma debe evitar infraestructura independiente por gimnasio.

### Modelo compartido

- Un repositorio.
- Un despliegue principal.
- Una base PostgreSQL compartida.
- Un sistema de autenticación.
- Un almacenamiento común con separación lógica.
- Un sistema de jobs, notificaciones, monitoreo y backups.

### Entidades requeridas

- `Gym`
- `GymSettings`
- `GymUser` o membresía de usuario por gimnasio
- `GymSubscription`
- `PlanEntitlement`
- `Payment`
- `CheckIn`
- `Notification`
- `AuditLog`

Cada entidad operativa debe pertenecer directa o indirectamente a un `gymId`.

### Reglas técnicas

- Aislamiento estricto de datos por gimnasio.
- Índices por `gymId` en tablas de alto uso.
- Autorización validada en backend, nunca solo en interfaz.
- Sin bases de datos separadas por gimnasio durante la etapa inicial.
- Sin despliegues separados por gimnasio.
- Feature flags y módulos por suscripción.
- Backups y recuperación centralizados.
- Métricas de consumo por tenant para vigilar costos.

## 6. Modelo comercial preliminar

Los precios son hipótesis para validación, no una decisión contractual definitiva.

| Plan | Precio objetivo | Alcance |
|---|---:|---|
| Founding / Primary | $29.990–$34.990 mensual | Core completo, soporte razonable y participación en validación |
| Core | $34.990 mensual | Miembros, membresías, agenda, reservas y asistencia |
| Pro | $49.990–$59.990 mensual | Dashboard, pagos, alertas, branding y automatizaciones básicas |
| Health | +$14.990–$24.990 mensual | Ficha clínica, SOAP, restricciones y reportes |
| Managed / Business | Desde $89.990 mensual | Soporte prioritario, multi-sucursal, integraciones y acompañamiento |

### Condiciones necesarias

- No ofrecer desarrollos ilimitados dentro de la suscripción.
- Diferenciar soporte de producto y desarrollo personalizado.
- Cobrar onboarding cuando el proceso deje de ser experimental.
- Definir límites razonables por plan sin castigar el crecimiento normal del gimnasio.
- Revisar margen considerando infraestructura, soporte, medios de pago y tiempo operativo.

## 7. Matriz de paridad competitiva

### P0 — Cerrar operación crítica de Primary

Bloquea piloto productivo y cualquier venta responsable.

- [ ] Corregir selección de membresía pagada para consumo/devolución de sesiones (PR #43).
- [ ] Cerrar asistencia post-clase y no-show con ventana definida.
- [ ] Completar invitaciones individuales, cancelación y expiración.
- [ ] Mejorar mensajes de elegibilidad y bloqueo para miembros.
- [ ] Mostrar próximas reservas, historial y saldo claramente.
- [ ] Finalizar QA mobile de rutas críticas.
- [ ] Separar datos demo y datos productivos.
- [ ] Backups, logs, monitoreo, rate limits y audit log mínimo.
- [ ] Dashboard administrativo mínimo.

### P1 — Paridad comercial mínima con GymHub

Necesaria para que la plataforma pueda competir como solución general de gimnasio.

#### Clientes y membresías

- [ ] Ficha completa de cliente con contacto, estado, plan y actividad.
- [ ] Importación CSV/Excel de miembros y membresías.
- [ ] Packs, mensualidades, ilimitados y vencimientos.
- [ ] Renovación rápida desde ficha del miembro.
- [ ] Historial de membresías, renovaciones y pagos.
- [ ] Segmentos: activos, inactivos, por vencer, morosos y sin asistencia reciente.

#### Agenda, reservas y asistencia

- [ ] Vista diaria/semanal optimizada para recepción y coaches.
- [ ] Reserva grupal por cupo.
- [ ] PT y KINE por propuesta/confirmación.
- [ ] Reemplazo de coach con trazabilidad.
- [ ] Lista de espera básica.
- [ ] Toma masiva de asistencia desde móvil.
- [ ] No-show y política configurable por gimnasio.
- [ ] Bloqueos de agenda, salas y ubicaciones.

#### Pagos y cobranza

- [ ] Entidad `Payment` separada de `Membership.paymentStatus`.
- [ ] Registro manual de efectivo, transferencia y tarjeta.
- [ ] Enlace de pago mediante proveedor chileno.
- [ ] Conciliación básica de pagos.
- [ ] Comprobantes y observaciones.
- [ ] Alertas de pago pendiente/vencido.
- [ ] Reporte de ingresos por período, plan y servicio.

#### Portal y experiencia del miembro

- [ ] Portal responsive con plan, saldo, reservas e historial.
- [ ] Perfil y actualización de datos básicos.
- [ ] Avisos y anuncios del gimnasio.
- [ ] Flujo claro de renovación/contacto.
- [ ] Página pública configurable con horarios, servicios y acceso.

#### Operación y retención

- [ ] Dashboard de miembros activos, vencidos y por vencer.
- [ ] Ocupación por clase, horario y coach.
- [ ] Ausencias y frecuencia de asistencia.
- [ ] Lista accionable de clientes en riesgo.
- [ ] Acciones rápidas: contactar, renovar, reactivar o regalar sesión.
- [ ] Exportación CSV/Excel.

### P2 — Productización multi-gimnasio

Debe comenzar después de estabilizar el core de Primary y **antes de incorporar un segundo gimnasio real**.

- [ ] Crear entidad `Gym`.
- [ ] Crear pertenencia usuario–gimnasio con rol por tenant.
- [ ] Añadir `gymId` y aislamiento a datos operativos.
- [ ] Migrar Primary como primer tenant.
- [ ] Retomar branding configurable del PR #41.
- [ ] Panel Super Admin.
- [ ] Crear, activar, suspender y configurar gimnasios.
- [ ] Asignar administrador principal.
- [ ] Feature flags y módulos por plan.
- [ ] Suscripción del gimnasio separada de membresías de alumnos.
- [ ] Métricas de uso, límites y estado de facturación.
- [ ] Onboarding guiado.
- [ ] Importación inicial de datos.
- [ ] Plantillas configurables de servicios, planes y políticas.

### P3 — Paridad ampliada

Se desarrollará después de alcanzar P0–P2, según demanda real.

- [ ] Check-in QR.
- [ ] Check-in con PIN.
- [ ] Lista de espera con promoción automática.
- [ ] Notificaciones automáticas por email.
- [ ] Integración WhatsApp formal.
- [ ] Recordatorios de clase y vencimiento.
- [ ] Rachas, frecuencia y progreso del miembro.
- [ ] Heatmap de asistencia.
- [ ] Rutinas y seguimiento de entrenamiento.
- [ ] Multi-sucursal.
- [ ] Recepción o roles administrativos personalizados.
- [ ] API e integraciones externas.

### P4 — Opcionales de diferenciación futura

- [ ] IA para consultas operativas y análisis de datos.
- [ ] Generación asistida de rutinas.
- [ ] Predicción de abandono.
- [ ] Aplicación móvil nativa.
- [ ] Integración avanzada con control de acceso físico.
- [ ] Marketplace o venta pública de planes.

## 8. Onboarding objetivo para un gimnasio

La incorporación no debe requerir cambios de código.

1. Crear gimnasio y administrador.
2. Configurar nombre, logo, colores y contactos.
3. Elegir módulos y plan SaaS.
4. Crear servicios, planes, precios y políticas.
5. Importar miembros, membresías y saldos.
6. Cargar coaches, kinesiólogos y permisos.
7. Crear calendario y series recurrentes.
8. Ejecutar piloto con staff y grupo reducido de miembros.
9. Corregir datos/configuración, no personalizar código.
10. Lanzar y revisar adopción a 7 y 30 días.

### Objetivos de onboarding

- Configuración inicial en menos de una jornada.
- Importación sin intervención directa en base de datos.
- Primeras clases y membresías creadas sin ayuda técnica.
- Capacitación de administrador en una sesión breve.
- Checklist repetible para cualquier gimnasio.

## 9. Definición de producto vendible v1

La plataforma se considera vendible cuando:

- [ ] Primary puede operar durante 30 días sin apoyo técnico diario.
- [ ] Admin gestiona miembros, membresías, agenda, pagos y asistencia.
- [ ] Coach opera desde móvil.
- [ ] Miembro entiende plan, saldo, reservas y bloqueos.
- [ ] Los datos están respaldados y aislados.
- [ ] Existe dashboard operativo mínimo.
- [ ] Existe onboarding documentado.
- [ ] Un segundo gimnasio puede configurarse sin crear código específico.
- [ ] El costo variable por gimnasio permite sostener un plan cercano a $34.990.
- [ ] Las solicitudes especiales se gestionan como roadmap o servicio adicional.

## 10. Métricas de negocio y producto

### Adopción

- Usuarios activos por gimnasio.
- Reservas digitales versus gestión manual.
- Porcentaje de clases con asistencia registrada.
- Tiempo de operación semanal ahorrado al administrador.

### Valor para el gimnasio

- Renovaciones próximas detectadas.
- Pagos pendientes recuperados.
- Ocupación media de clases.
- Miembros inactivos reactivados.
- Reducción de dobles reservas y errores de agenda.

### Economía SaaS

- Ingreso mensual recurrente.
- Costo de infraestructura por gimnasio.
- Horas de soporte por gimnasio.
- Costo de onboarding.
- Margen bruto estimado.
- Churn y motivos de baja.

## 11. Reglas para evitar una lista de deseos

- Ninguna función entra solo porque un competidor la publica.
- Cada ítem debe tener problema, usuario, impacto y criterio de aceptación.
- Primero se completa P0 antes de abrir P3 o P4.
- P1 puede desarrollarse en PRs pequeños después de cerrar los bloqueos actuales.
- P2 debe diseñarse antes del segundo cliente, pero no interrumpir el cierre de Primary.
- Una solicitud de un gimnasio no se convierte automáticamente en estándar del producto.
- No mantener forks por cliente.
- No prometer personalización ilimitada por $34.990.
- No intentar recuperar toda la inversión con Primary.
- El precio bajo exige operación, soporte e infraestructura estandarizados.

## 12. Próximo orden recomendado

1. Cerrar PR #43 y validar consumo/devolución de sesiones.
2. Cerrar pendientes operativos de asistencia, reemplazo e invitaciones.
3. Completar experiencia miembro y mobile-first.
4. Hardening productivo y piloto real con Primary.
5. Construir dashboard mínimo, pagos manuales/historial y alertas.
6. Validar precio Founding de $29.990–$34.990 con Primary.
7. Diseñar e implementar base multi-tenant.
8. Crear onboarding e importación para el segundo gimnasio.
9. Completar paridad P1.
10. Incorporar P3/P4 únicamente según uso, conversión y demanda.
