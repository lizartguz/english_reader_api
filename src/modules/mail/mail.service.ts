import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { SystemLogLevel } from '@/common/enums/domain.enums';
import { SystemLogSource } from '@/common/constants/system-log-sources.constants';
import { SystemLogWriterService } from '@/modules/system-logs/application/system-log-writer.service';
import {
  buildEmailVerificationEmail,
  buildPasswordChangedEmail,
  buildPasswordResetEmail,
  type PasswordChangeReason,
} from './mail.templates';

/**
 * Envío de correos transaccionales.
 *
 * Los fallos del proveedor SMTP no se propagan al usuario: quedan registrados
 * en `system_logs` y la operación de negocio continúa. Esto evita, por ejemplo,
 * que una caída del servidor de correo revele qué cuentas existen o impida
 * completar un registro ya validado.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  private readonly fromAddress: string;
  private readonly fromName: string;
  private readonly appName: string;
  private readonly passwordResetUrl: string;
  private readonly verificationUrl: string;
  private readonly passwordResetTtlMinutes: number;
  private readonly verificationTtlHours: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly systemLogWriter: SystemLogWriterService,
  ) {
    this.fromAddress = configService.get<string>('mail.fromAddress') as string;
    this.fromName = configService.get<string>('mail.fromName') as string;
    this.appName = configService.get<string>('app.name') as string;
    this.passwordResetUrl = configService.get<string>('mail.passwordResetUrl') as string;
    this.verificationUrl = configService.get<string>('verification.verificationUrl') as string;
    this.passwordResetTtlMinutes =
      configService.get<number>('security.passwordResetTtlMinutes') ?? 30;
    this.verificationTtlHours = configService.get<number>('verification.tokenTtlHours') ?? 24;
  }

  /** Envía el correo con el enlace para restablecer la contraseña. */
  async sendPasswordReset(to: string, firstName: string, token: string): Promise<void> {
    const link = this.buildLink(this.passwordResetUrl, token);
    const content = buildPasswordResetEmail({
      appName: this.appName,
      firstName,
      link,
      expiresInMinutes: this.passwordResetTtlMinutes,
    });

    await this.send(to, content.subject, content.html, content.text);
  }

  /** Envía un aviso de seguridad después de actualizar la contraseña. */
  async sendPasswordChanged(
    to: string,
    firstName: string,
    reason: PasswordChangeReason,
  ): Promise<void> {
    const content = buildPasswordChangedEmail({
      appName: this.appName,
      firstName,
      reason,
    });

    await this.send(to, content.subject, content.html, content.text);
  }

  /** Envía el correo de confirmación de cuenta tras el registro. */
  async sendEmailVerification(to: string, firstName: string, token: string): Promise<void> {
    const link = this.buildLink(this.verificationUrl, token);
    const content = buildEmailVerificationEmail({
      appName: this.appName,
      firstName,
      link,
      expiresInHours: this.verificationTtlHours,
    });

    await this.send(to, content.subject, content.html, content.text);
  }

  /**
   * Envía un correo y registra cualquier fallo del proveedor sin interrumpir
   * el flujo de negocio.
   */
  private async send(to: string, subject: string, html: string, text: string): Promise<void> {
    try {
      const transporter = this.getTransporter();

      if (!transporter) {
        this.logger.warn(
          `SMTP no configurado: se omitió el envío de "${subject}" a un destinatario.`,
        );
        return;
      }

      await transporter.sendMail({
        from: `"${this.fromName}" <${this.fromAddress}>`,
        to,
        subject,
        html,
        text,
      });
    } catch (error) {
      await this.systemLogWriter.write({
        level: SystemLogLevel.error,
        source: SystemLogSource.Mail,
        message: `No se pudo enviar el correo: ${(error as Error).message}`,
        exceptionName: (error as Error).name,
        // El destinatario no se registra para no dejar datos personales en los logs.
        metadata: { subject },
      });
    }
  }

  /** Crea el transporte SMTP la primera vez que se necesita. */
  private getTransporter(): Transporter | null {
    const host = this.configService.get<string>('mail.host');

    if (!host) return null;

    this.transporter ??= createTransport({
      host,
      port: this.configService.get<number>('mail.port'),
      secure: this.configService.get<boolean>('mail.secure'),
      auth: this.buildAuth(),
    });

    return this.transporter;
  }

  /** Devuelve las credenciales SMTP solo cuando están configuradas. */
  private buildAuth(): { user: string; pass: string } | undefined {
    const user = this.configService.get<string>('mail.username');
    const pass = this.configService.get<string>('mail.password');

    return user ? { user, pass: pass ?? '' } : undefined;
  }

  /** Compone el enlace público agregando el token como parámetro de consulta. */
  private buildLink(baseUrl: string, token: string): string {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
  }
}
