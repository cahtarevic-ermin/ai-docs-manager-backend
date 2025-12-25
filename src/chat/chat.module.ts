import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { LogosModule } from '../logos/logos.module';

@Module({
  imports: [LogosModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
