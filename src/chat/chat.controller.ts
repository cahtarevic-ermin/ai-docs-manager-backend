import { Controller, Post, Get, Delete, Body, Param, Res, ParseUUIDPipe } from '@nestjs/common';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@CurrentUser('id') userId: string, @Body() chatRequest: ChatRequestDto, @Res() res: Response) {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const stream = this.chatService.streamChat(userId, chatRequest);

      for await (const chunk of stream) {
        // Forward the SSE data from Logos
        res.write(chunk);
      }

      res.end();
    } catch (error) {
      // Send error as SSE event
      res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }

  @Get('history/:documentId')
  async getChatHistory(@CurrentUser('id') userId: string, @Param('documentId', ParseUUIDPipe) documentId: string) {
    return this.chatService.getChatHistory(userId, documentId);
  }

  @Delete('history/:documentId')
  async clearChatHistory(@CurrentUser('id') userId: string, @Param('documentId', ParseUUIDPipe) documentId: string) {
    await this.chatService.clearChatHistory(userId, documentId);
    return { message: 'Chat history cleared' };
  }
}
