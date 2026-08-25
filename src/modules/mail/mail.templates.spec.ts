import {
  buildEmailVerificationEmail,
  buildPasswordChangedEmail,
  buildPasswordResetEmail,
} from './mail.templates';

describe('Plantillas de correo', () => {
  const base = {
    appName: 'English Reader',
    firstName: 'Santiago',
  };

  it('genera el correo de recuperación con layout responsive de 600 px y fallback de texto', () => {
    const content = buildPasswordResetEmail({
      ...base,
      link: 'https://app.test/reset-password?token=abc123',
      expiresInMinutes: 30,
    });

    expect(content.subject).toContain('restablece tu contraseña');
    expect(content.html).toContain('max-width:600px');
    expect(content.html).toContain('width="600"');
    expect(content.html).toContain('Restablecer contraseña');
    expect(content.html).toContain('https://app.test/reset-password?token=abc123');
    expect(content.text).toContain('Abre este enlace para continuar');
    expect(content.text).toContain('30 minutos');
  });

  it('escapa valores variables para evitar inyección HTML', () => {
    const content = buildPasswordResetEmail({
      appName: '<script>alert(1)</script>',
      firstName: '<img src=x onerror=alert(1)>',
      link: 'https://app.test/reset-password?token=abc123&next=<bad>',
      expiresInMinutes: 15,
    });

    expect(content.html).not.toContain('<script>alert(1)</script>');
    expect(content.html).not.toContain('<img src=x onerror=alert(1)>');
    expect(content.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(content.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(content.html).toContain('token=abc123&amp;next=&lt;bad&gt;');
  });

  it('genera aviso de contraseña actualizada sin enlace de acción sensible', () => {
    const content = buildPasswordChangedEmail({
      ...base,
      reason: 'change',
    });

    expect(content.subject).toContain('contraseña actualizada');
    expect(content.html).toContain('Tu contraseña fue actualizada');
    expect(content.html).toContain('otras sesiones abiertas fueron cerradas');
    expect(content.html).not.toContain('token=');
    expect(content.text).toContain('contraseña de tu cuenta se actualizó correctamente');
  });

  it('diferencia el aviso cuando la contraseña se restablece por enlace', () => {
    const content = buildPasswordChangedEmail({
      ...base,
      reason: 'reset',
    });

    expect(content.html).toContain('las sesiones abiertas fueron cerradas');
    expect(content.text).toContain('Inicia sesión nuevamente');
  });

  it('mantiene la plantilla de verificación con el mismo layout base', () => {
    const content = buildEmailVerificationEmail({
      ...base,
      link: 'https://app.test/verify-email?token=abc123',
      expiresInHours: 24,
    });

    expect(content.html).toContain('max-width:600px');
    expect(content.html).toContain('Confirmar mi correo');
    expect(content.text).toContain('24 horas');
  });
});
