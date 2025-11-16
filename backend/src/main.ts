import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global prefix
  const apiPrefix = configService.get('API_PREFIX') || 'api';
  const apiVersion = configService.get('API_VERSION') || 'v1';
  app.setGlobalPrefix(`${apiPrefix}/${apiVersion}`);

  // CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGIN') || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('SuperShop API')
    .setDescription('Multi-tenant Shop Management System API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Prefer the platform provided PORT environment variable (Cloud Run/Heroku) and
  // fall back to configuration or a sensible default. Ensure value is a number.
  const envPort = process.env.PORT ? Number(process.env.PORT) : undefined;
  const configPort = configService.get('PORT') ? Number(configService.get('PORT')) : undefined;
  const port = envPort || configPort || 8080;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Application is running on: http://0.0.0.0:${port}`);
  console.log(`🔎 Effective PORT env: ${process.env.PORT ?? '<not set>'}, config PORT: ${configService.get('PORT') ?? '<not set>'}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
