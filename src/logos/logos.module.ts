import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LogosService } from './logos.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.get<string>('logos.baseUrl'),
        timeout: 30000,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [LogosService],
  exports: [LogosService],
})
export class LogosModule {}
