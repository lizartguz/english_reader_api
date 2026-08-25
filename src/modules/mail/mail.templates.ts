/** Contenido listo para enviar de un correo transaccional. */
export interface MailContent {
  subject: string;
  html: string;
  text: string;
}

/** Tema visual reutilizable para mantener correos consistentes y editables. */
export interface MailTheme {
  maxWidth: number;
  backgroundColor: string;
  surfaceColor: string;
  primaryColor: string;
  primaryTextColor: string;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
  subtleBackgroundColor: string;
}

/** Datos comunes de las plantillas. */
interface BaseTemplateInput {
  appName: string;
  firstName: string;
  theme?: Partial<MailTheme>;
}

interface LinkTemplateInput extends BaseTemplateInput {
  link: string;
}

interface LayoutInput extends BaseTemplateInput {
  title: string;
  preheader: string;
  bodyHtml: string;
  footerNote?: string;
}

export type PasswordChangeReason = 'reset' | 'change';

const DEFAULT_THEME: MailTheme = {
  maxWidth: 600,
  backgroundColor: '#f3f6f8',
  surfaceColor: '#ffffff',
  primaryColor: '#2563eb',
  primaryTextColor: '#ffffff',
  textColor: '#17212b',
  mutedTextColor: '#5f6c7b',
  borderColor: '#d9e2ec',
  subtleBackgroundColor: '#f8fafc',
};

/** Combina el tema base con personalizaciones futuras sin repetir estructura. */
function resolveTheme(input?: Partial<MailTheme>): MailTheme {
  return { ...DEFAULT_THEME, ...input };
}

/** Evita que nombres o textos variables puedan inyectar HTML en el correo. */
function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function greeting(firstName: string): string {
  const safeName = firstName.trim() ? escapeHtml(firstName.trim()) : 'lector';
  return `Hola ${safeName}:`;
}

function paragraph(content: string): string {
  return `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:inherit;">${content}</p>`;
}

function securityBox(content: string, theme: MailTheme): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;border:1px solid ${theme.borderColor};background:${theme.subtleBackgroundColor};border-radius:8px;">
      <tr>
        <td style="padding:16px;font-size:13px;line-height:1.55;color:${theme.mutedTextColor};">
          ${content}
        </td>
      </tr>
    </table>`;
}

function actionButton(link: string, label: string, theme: MailTheme): string {
  const safeLink = escapeHtml(link);
  const safeLabel = escapeHtml(label);

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 18px 0;">
      <tr>
        <td align="center" bgcolor="${theme.primaryColor}" style="border-radius:8px;">
          <a href="${safeLink}" style="display:inline-block;padding:13px 24px;border-radius:8px;font-size:15px;line-height:1.2;font-weight:bold;text-decoration:none;color:${theme.primaryTextColor};background:${theme.primaryColor};">
            ${safeLabel}
          </a>
        </td>
      </tr>
    </table>`;
}

function fallbackLink(link: string, theme: MailTheme): string {
  const safeLink = escapeHtml(link);

  return `
    <p style="margin:0 0 18px 0;font-size:13px;line-height:1.6;color:${theme.mutedTextColor};">
      Si el botón no funciona, copia y pega este enlace en tu navegador:
      <br>
      <span style="word-break:break-all;color:${theme.textColor};">${safeLink}</span>
    </p>`;
}

/**
 * Envoltura visual compartida por todos los correos transaccionales.
 *
 * El contenido se arma con tablas y estilos en línea porque muchos clientes de
 * correo recortan CSS externo. El ancho base se mantiene en 600 px y escala a
 * móviles con `width:100%`.
 */
function wrapLayout(input: LayoutInput): string {
  const theme = resolveTheme(input.theme);
  const appName = escapeHtml(input.appName);
  const title = escapeHtml(input.title);
  const preheader = escapeHtml(input.preheader);
  const footerNote =
    input.footerNote ??
    'Si no solicitaste este correo, puedes ignorarlo con seguridad o contactar al administrador.';

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${title}</title>
    <style>
      @media screen and (max-width: 620px) {
        .er-shell { padding: 16px !important; }
        .er-container { width: 100% !important; }
        .er-content { padding: 24px 20px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${theme.backgroundColor};font-family:Arial,Helvetica,sans-serif;color:${theme.textColor};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:${theme.backgroundColor};">
      <tr>
        <td align="center" class="er-shell" style="padding:24px;">
          <table role="presentation" width="${theme.maxWidth}" cellpadding="0" cellspacing="0" class="er-container" style="width:100%;max-width:${theme.maxWidth}px;background:${theme.surfaceColor};border:1px solid ${theme.borderColor};border-radius:8px;overflow:hidden;">
            <tr>
              <td class="er-content" style="padding:32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:16px;line-height:1.4;font-weight:bold;color:${theme.primaryColor};padding-bottom:22px;">
                      ${appName}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <h1 style="margin:0 0 18px 0;font-size:24px;line-height:1.25;color:${theme.textColor};font-weight:bold;">
                        ${title}
                      </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size:15px;line-height:1.6;color:${theme.textColor};">
                      ${input.bodyHtml}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:20px;border-top:1px solid ${theme.borderColor};font-size:12px;line-height:1.55;color:${theme.mutedTextColor};">
                      ${escapeHtml(footerNote)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Correo con el enlace para restablecer la contraseña. */
export function buildPasswordResetEmail(
  input: LinkTemplateInput & { expiresInMinutes: number },
): MailContent {
  const theme = resolveTheme(input.theme);
  const title = 'Restablece tu contraseña';
  const body = [
    paragraph(greeting(input.firstName)),
    paragraph('Recibimos una solicitud para restablecer la contraseña de tu cuenta.'),
    actionButton(input.link, 'Restablecer contraseña', theme),
    fallbackLink(input.link, theme),
    securityBox(
      `El enlace vence en ${escapeHtml(input.expiresInMinutes)} minutos y solo puede usarse una vez.`,
      theme,
    ),
  ].join('');

  return {
    subject: `${input.appName}: restablece tu contraseña`,
    html: wrapLayout({
      ...input,
      title,
      preheader: 'Usa este enlace para restablecer tu contraseña de forma segura.',
      bodyHtml: body,
    }),
    text: [
      greeting(input.firstName).replace(/&#39;/g, "'"),
      '',
      'Recibimos una solicitud para restablecer la contraseña de tu cuenta.',
      `Abre este enlace para continuar: ${input.link}`,
      '',
      `El enlace vence en ${input.expiresInMinutes} minutos y solo puede usarse una vez.`,
      'Si no solicitaste este correo, puedes ignorarlo o contactar al administrador.',
    ].join('\n'),
  };
}

/** Correo de seguridad enviado después de actualizar la contraseña. */
export function buildPasswordChangedEmail(
  input: BaseTemplateInput & { reason: PasswordChangeReason },
): MailContent {
  const theme = resolveTheme(input.theme);
  const isReset = input.reason === 'reset';
  const title = 'Tu contraseña fue actualizada';
  const sessionNote = isReset
    ? 'Por seguridad, las sesiones abiertas fueron cerradas. Inicia sesión nuevamente con tu nueva contraseña.'
    : 'Por seguridad, otras sesiones abiertas fueron cerradas. Puedes seguir usando la sesión desde la que hiciste el cambio.';
  const body = [
    paragraph(greeting(input.firstName)),
    paragraph('Te confirmamos que la contraseña de tu cuenta se actualizó correctamente.'),
    securityBox(sessionNote, theme),
    paragraph(
      'Si reconoces esta actividad, no necesitas hacer nada más. Si no fuiste tú, solicita una nueva recuperación de contraseña y contacta al administrador.',
    ),
  ].join('');

  return {
    subject: `${input.appName}: contraseña actualizada`,
    html: wrapLayout({
      ...input,
      title,
      preheader: 'Confirmación de cambio de contraseña de tu cuenta.',
      bodyHtml: body,
      footerNote:
        'Este es un aviso de seguridad automático. No compartas tus contraseñas ni tokens de acceso.',
    }),
    text: [
      greeting(input.firstName).replace(/&#39;/g, "'"),
      '',
      'Te confirmamos que la contraseña de tu cuenta se actualizó correctamente.',
      sessionNote,
      '',
      'Si no fuiste tú, solicita una nueva recuperación de contraseña y contacta al administrador.',
    ].join('\n'),
  };
}

/** Correo de confirmación de cuenta enviado tras el registro. */
export function buildEmailVerificationEmail(
  input: LinkTemplateInput & { expiresInHours: number },
): MailContent {
  const theme = resolveTheme(input.theme);
  const title = 'Confirma tu correo';
  const body = [
    paragraph(greeting(input.firstName)),
    paragraph(
      'Gracias por registrarte. Confirma tu correo para activar tu cuenta y comenzar a leer.',
    ),
    actionButton(input.link, 'Confirmar mi correo', theme),
    fallbackLink(input.link, theme),
    securityBox(`El enlace vence en ${escapeHtml(input.expiresInHours)} horas.`, theme),
  ].join('');

  return {
    subject: `${input.appName}: confirma tu correo`,
    html: wrapLayout({
      ...input,
      title,
      preheader: 'Confirma tu correo para activar tu cuenta de lectura.',
      bodyHtml: body,
    }),
    text: [
      greeting(input.firstName).replace(/&#39;/g, "'"),
      '',
      'Gracias por registrarte. Confirma tu correo para activar tu cuenta.',
      `Abre este enlace para continuar: ${input.link}`,
      '',
      `El enlace vence en ${input.expiresInHours} horas.`,
    ].join('\n'),
  };
}
