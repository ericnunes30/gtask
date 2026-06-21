import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DataSource } from 'typeorm';
import {
  WhatsAppConfig,
  WhatsAppMessage,
  WhatsAppResponse,
  NotificationPriority,
} from '../interfaces/whatsapp.types';
import { MessageFormatterService } from '../factories/message-formatter.factory';
import { User } from '../../user/entities/user.entity';
import { StructuredNotificationEntity } from '../../notification/entities/notification.entity';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly rateLimitMap = new Map<string, Date>();
  private config!: WhatsAppConfig;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly messageFormatter: MessageFormatterService,
    private readonly dataSource: DataSource,
  ) {
    this.loadConfig();
  }

  private loadConfig(): void {
    this.config = {
      apiKey: this.configService.get<string>('WHATSAPP_API_KEY') || '',
      instance: this.configService.get<string>('WHATSAPP_INSTANCE') || '',
      baseUrl: this.configService.get<string>('WHATSAPP_BASE_URL') || '',
      delay: this.configService.get<number>('WHATSAPP_DELAY', 1000),
      enabled: this.configService.get<boolean>('WHATSAPP_ENABLED', true),
    };
  }

  async sendNotification(
    user: User,
    notification: StructuredNotificationEntity,
  ): Promise<WhatsAppResponse> {
    const n = notification as unknown as {
      type?: string;
      priority?: string;
      title?: string;
      message?: string;
    };
    try {
      // Log detalhado da notificação recebida
      this.logger.log(`=== WHATSAPP NOTIFICATION RECEIVED ===`);
      this.logger.log(`User ID: ${user.id}`);
      this.logger.log(`User Email: ${user.email}`);
      this.logger.log(`Notification Type: ${n.type}`);
      this.logger.log(`Notification Priority: ${n.priority}`);
      this.logger.log(`Notification Title: ${n.title}`);
      this.logger.log(`Notification Message: ${n.message}`);
      this.logger.log(
        `Full Notification: ${JSON.stringify(notification, null, 2)}`,
      );
      this.logger.log(`=== END NOTIFICATION DETAILS ===`);

      // Buscar dados completos do usuário incluindo campos de WhatsApp
      const userWithWhatsApp = await this.dataSource
        .createQueryBuilder(User, 'user')
        .select([
          'user.id',
          'user.name',
          'user.email',
          'user.whatsapp',
          'user.is_active',
          'user.whatsappPriorityThreshold',
          'user.whatsappQuietHoursStart',
          'user.whatsappQuietHoursEnd',
        ])
        .where('user.id = :id', { id: user.id })
        .getOne();

      if (!userWithWhatsApp) {
        this.logger.warn(`User ${user.id} not found`);
        return {
          success: false,
          error: 'User not found',
          timestamp: new Date(),
        };
      }

      // Log dos dados do usuário encontrados
      this.logger.log(`=== USER DATA FOUND ===`);
      this.logger.log(`User ID: ${userWithWhatsApp.id}`);
      this.logger.log(`User Name: ${userWithWhatsApp.name}`);
      this.logger.log(`User Email: ${userWithWhatsApp.email}`);
      this.logger.log(`User WhatsApp: ${userWithWhatsApp.whatsapp}`);
      this.logger.log(`User Active: ${userWithWhatsApp.is_active}`);
      this.logger.log(
        `User Priority Threshold: ${userWithWhatsApp.whatsappPriorityThreshold}`,
      );
      this.logger.log(
        `User Quiet Hours Start: ${userWithWhatsApp.whatsappQuietHoursStart}`,
      );
      this.logger.log(
        `User Quiet Hours End: ${userWithWhatsApp.whatsappQuietHoursEnd}`,
      );
      this.logger.log(`=== END USER DATA ===`);

      // Verificar se WhatsApp está habilitado
      if (!this.config.enabled) {
        this.logger.warn('WhatsApp notifications are disabled');
        return {
          success: false,
          error: 'WhatsApp notifications are disabled',
          timestamp: new Date(),
        };
      }

      // Log da configuração do WhatsApp
      this.logger.log(`=== WHATSAPP CONFIG ===`);
      this.logger.log(`WhatsApp Enabled: ${this.config.enabled}`);
      this.logger.log(`WhatsApp Base URL: ${this.config.baseUrl}`);
      this.logger.log(`WhatsApp Instance: ${this.config.instance}`);
      this.logger.log(
        `WhatsApp API Key Length: ${this.config.apiKey?.length || 0}`,
      );
      this.logger.log(
        `WhatsApp API Key (first 10 chars): ${this.config.apiKey ? this.config.apiKey.substring(0, 10) + '...' : 'EMPTY'}`,
      );
      this.logger.log(`WhatsApp Delay: ${this.config.delay}`);
      this.logger.log(`=== END CONFIG ===`);

      // Verificar se usuário está ativo
      if (!userWithWhatsApp.is_active) {
        this.logger.debug(
          `User ${userWithWhatsApp.id} is inactive, WhatsApp notifications disabled`,
        );
        return {
          success: false,
          error: 'User is inactive',
          timestamp: new Date(),
        };
      }

      // Verificar prioridade
      if (
        !this.shouldSendByPriority(
          String(n.priority),
          userWithWhatsApp.whatsappPriorityThreshold,
        )
      ) {
        this.logger.debug(
          `Notification priority ${String(n.priority)} below threshold for user ${userWithWhatsApp.id}`,
        );
        return {
          success: false,
          error: 'Priority below user threshold',
          timestamp: new Date(),
        };
      }

      // Verificar horário de silêncio
      if (
        this.isQuietHours(
          userWithWhatsApp.whatsappQuietHoursStart,
          userWithWhatsApp.whatsappQuietHoursEnd,
        )
      ) {
        this.logger.debug(`Quiet hours active for user ${userWithWhatsApp.id}`);
        return {
          success: false,
          error: 'Quiet hours active',
          timestamp: new Date(),
        };
      }

      // Verificar rate limit
      if (!this.checkRateLimit(userWithWhatsApp.id.toString())) {
        this.logger.warn(`Rate limit exceeded for user ${userWithWhatsApp.id}`);
        return {
          success: false,
          error: 'Rate limit exceeded',
          timestamp: new Date(),
        };
      }

      // Validar telefone (agora usando o campo whatsapp)
      if (!userWithWhatsApp.whatsapp) {
        this.logger.warn(`No WhatsApp number for user ${userWithWhatsApp.id}`);
        return {
          success: false,
          error: 'No WhatsApp number configured',
          timestamp: new Date(),
        };
      }

      const formattedPhone = this.messageFormatter.formatPhoneNumber(
        userWithWhatsApp.whatsapp,
      );
      if (!this.messageFormatter.validatePhoneNumber(formattedPhone)) {
        this.logger.warn(
          `Invalid WhatsApp number for user ${userWithWhatsApp.id}: ${userWithWhatsApp.whatsapp}`,
        );
        return {
          success: false,
          error: 'Invalid WhatsApp number format',
          timestamp: new Date(),
        };
      }

      // Formatar mensagem
      const messageText = this.messageFormatter.formatMessage(notification);

      // Enviar mensagem
      const result = await this.sendMessage(formattedPhone, messageText);

      // Registrar métricas
      this.logger.log(
        `WhatsApp notification sent to user ${user.id}: ${n.type}`,
      );

      return result;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to send WhatsApp notification to user ${user.id}:`,
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  async sendMessage(
    phoneNumber: string,
    text: string,
  ): Promise<WhatsAppResponse> {
    const message: WhatsAppMessage = {
      number: phoneNumber,
      text,
      delay: Number(this.config.delay),
    };

    const url = `${this.config.baseUrl}/message/sendText/${this.config.instance}`;

    // Log detalhado da requisição
    this.logger.log(`=== WHATSAPP REQUEST DETAILS ===`);
    this.logger.log(`URL: ${url}`);
    this.logger.log(`Method: POST`);
    this.logger.log(
      `Headers: ${JSON.stringify(
        {
          apikey: this.config.apiKey
            ? `${this.config.apiKey.substring(0, 10)}...`
            : 'EMPTY',
          'Content-Type': 'application/json',
        },
        null,
        2,
      )}`,
    );
    this.logger.log(`Body: ${JSON.stringify(message, null, 2)}`);
    this.logger.log(`Config Instance: ${this.config.instance}`);
    this.logger.log(`Config Base URL: ${this.config.baseUrl}`);
    this.logger.log(`API Key Length: ${this.config.apiKey?.length || 0}`);
    this.logger.log(`=== END REQUEST DETAILS ===`);

    try {
      const response = await firstValueFrom(
        this.httpService.post<{ id?: string | number }>(url, message, {
          headers: {
            apikey: this.config.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }),
      );

      this.logger.debug(`WhatsApp message sent successfully to ${phoneNumber}`);

      return {
        success: true,
        messageId:
          response.data?.id !== undefined
            ? String(response.data.id)
            : undefined,
        timestamp: new Date(),
      };
    } catch (error: unknown) {
      const resp = getAxiosErrorResponse(error);
      this.logger.error(
        `Failed to send WhatsApp message to ${phoneNumber}:`,
        resp?.data ?? (error instanceof Error ? error.message : String(error)),
      );

      // Log detalhado do erro
      this.logger.error(`=== WHATSAPP ERROR DETAILS ===`);
      this.logger.error(`Error Status: ${resp?.status ?? 'n/a'}`);
      this.logger.error(`Error Status Text: ${resp?.statusText ?? 'n/a'}`);
      this.logger.error(
        `Error Headers: ${JSON.stringify(resp?.headers ?? {}, null, 2)}`,
      );
      this.logger.error(
        `Error Data: ${JSON.stringify(resp?.data ?? {}, null, 2)}`,
      );
      this.logger.error(
        `Error Message: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.logger.error(
        `Error Stack: ${error instanceof Error ? error.stack : String(error)}`,
      );
      this.logger.error(`=== END ERROR DETAILS ===`);

      // Tentar novamente com retry
      if (resp && typeof resp.status === 'number' && resp.status >= 500) {
        return this.retryWithBackoff(phoneNumber, text, 1);
      }

      const apiMessage = (resp?.data as { message?: string } | undefined)
        ?.message;
      const errorMessage =
        apiMessage ?? (error instanceof Error ? error.message : String(error));
      throw new HttpException(
        `Failed to send WhatsApp message: ${errorMessage}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async retryWithBackoff(
    phoneNumber: string,
    text: string,
    attempt: number,
  ): Promise<WhatsAppResponse> {
    if (attempt > 3) {
      this.logger.error(
        `Max retries exceeded for WhatsApp message to ${phoneNumber}`,
      );
      return {
        success: false,
        error: 'Max retries exceeded',
        timestamp: new Date(),
      };
    }

    const delay = Math.pow(2, attempt) * 1000; // Backoff exponencial
    this.logger.warn(
      `Retrying WhatsApp message to ${phoneNumber} (attempt ${attempt}) in ${delay}ms`,
    );

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      return await this.sendMessage(phoneNumber, text);
    } catch {
      return this.retryWithBackoff(phoneNumber, text, attempt + 1);
    }
  }

  private shouldSendByPriority(
    notificationPriority: string,
    userThreshold: string,
  ): boolean {
    const priorityOrder: Record<string, number> = {
      [NotificationPriority.LOW]: 1,
      [NotificationPriority.MEDIUM]: 2,
      [NotificationPriority.HIGH]: 3,
      [NotificationPriority.URGENT]: 4,
    };

    const notificationLevel = priorityOrder[notificationPriority] || 0;
    const thresholdLevel =
      priorityOrder[userThreshold as NotificationPriority] || 2; // Default MEDIUM

    return notificationLevel >= thresholdLevel;
  }

  private isQuietHours(
    startTime: string | undefined,
    endTime: string | undefined,
  ): boolean {
    if (!startTime || !endTime) return false;

    const now = new Date();
    const currentTime =
      now.getHours().toString().padStart(2, '0') +
      ':' +
      now.getMinutes().toString().padStart(2, '0');

    // Se o horário de início for menor que o de fim, é no mesmo dia
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    }
    // Se não, atravessa a meia-noite
    else {
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private checkRateLimit(userId: string): boolean {
    const now = new Date();
    const lastMessage = this.rateLimitMap.get(userId);

    if (lastMessage) {
      const timeDiff = now.getTime() - lastMessage.getTime();
      if (timeDiff < 60000) {
        // 1 minuto
        return false;
      }
    }

    this.rateLimitMap.set(userId, now);
    return true;
  }

  getConfig(): WhatsAppConfig {
    return this.config;
  }

  updateConfig(config: Partial<WhatsAppConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.log('WhatsApp configuration updated');
  }
}

/**
 * Extrai de forma segura o `response` de um erro estilo axios.
 * Retorna `null` se o erro nao tiver essa estrutura.
 */
function getAxiosErrorResponse(error: unknown): {
  status?: number;
  statusText?: string;
  headers?: Record<string, unknown>;
  data?: unknown;
} | null {
  if (!error || typeof error !== 'object') return null;
  const response = (error as { response?: unknown }).response;
  if (!response || typeof response !== 'object') return null;
  const r = response as {
    status?: unknown;
    statusText?: unknown;
    headers?: unknown;
    data?: unknown;
  };
  return {
    status: typeof r.status === 'number' ? r.status : undefined,
    statusText: typeof r.statusText === 'string' ? r.statusText : undefined,
    headers:
      r.headers && typeof r.headers === 'object'
        ? (r.headers as Record<string, unknown>)
        : undefined,
    data: r.data,
  };
}
