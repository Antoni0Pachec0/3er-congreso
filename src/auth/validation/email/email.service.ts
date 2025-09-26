// src/auth/core/email/email.service.ts
import * as nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
    });
  }

  // Método para enviar código de verificación con diseño mejorado
  async sendVerificationCode(to: string, code: string) {
    const htmlContent = this.generateVerificationTemplate(code);

    const mailOptions = {
      from: this.configService.get<string>('EMAIL_USER'),
      to,
      subject: 'Código de Verificación - Congreso Internacional TI',
      html: htmlContent,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error enviando correo:', error);
      throw new Error('No se pudo enviar el correo de verificación');
    }
  }

  // Generar plantilla HTML directamente en el código
  private generateVerificationTemplate(code: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Arial', sans-serif;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #2c3e50, #3498db);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .content {
      padding: 30px;
    }
    .code {
      font-size: 32px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 8px;
      margin: 30px 0;
      color: #2c3e50;
      background: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 14px;
      color: #6c757d;
    }
    .event-info {
      background: #e9ecef;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>3er Congreso Internacional</h1>
      <h2>Tecnologías de la Información - Innovación Digital</h2>
    </div>
    
    <div class="content">
      <h3>Estimado participante,</h3>
      <p>Su código de verificación para el evento es:</p>
      
      <div class="code">${code}</div>
      
      <p>Este código expirará en 10 minutos. Utilícelo para completar su registro.</p>
      
      <div class="event-info">
        <p><strong>Fecha:</strong> 12-14 Noviembre 2025</p>
        <p><strong>Lugar:</strong> Avenida, Universidad Tecnológica 1, Santo la Villa. 75481 Tomasabaca, Paz.</p>
      </div>
    </div>
    
    <div class="footer">
      <p>© 2025 Congreso Internacional de Tecnologías de la Información</p>
      <p>Si no solicitó este código, por favor ignore este mensaje.</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}