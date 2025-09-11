// src/auth/email/email.service.ts
import * as nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Inicializar el transporter en el constructor
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
    });
  }

  // Método para enviar código de verificación (MANTENIENDO tu implementación)
  async sendVerificationCode(to: string, code: string) {
    const mailOptions = {
      from: this.configService.get<string>('EMAIL_USER'),
      to,
      subject: 'Código de Verificación',
      html: `
        <h2>Código de Verificación</h2>
        <p>Tu código de verificación es: <strong>${code}</strong></p>
        <p>Este código expirará en 10 minutos.</p>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Correo enviado exitosamente a:', to);
    } catch (error) {
      console.error('Error enviando correo:', error);
      throw new Error('No se pudo enviar el correo de verificación');
    }
  }
}