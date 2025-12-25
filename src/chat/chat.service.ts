import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LogosService } from '../logos/logos.service';
import { DocumentStatus } from '@prisma/client';
import { ChatRequestDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logosService: LogosService,
  ) {}

  async validateDocumentAccess(userId: string, documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.user_id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (document.status !== DocumentStatus.COMPLETED) {
      throw new BadRequestException(`Document is not ready. Current status: ${document.status}`);
    }

    if (!document.logos_id) {
      throw new BadRequestException('Document has no Logos reference');
    }

    return document;
  }

  async *streamChat(userId: string, chatRequest: ChatRequestDto) {
    const document = await this.validateDocumentAccess(userId, chatRequest.document_id);

    // Stream from Logos service
    const stream = this.logosService.chatStream(
      document.logos_id!,
      chatRequest.message,
      chatRequest.conversation_history || [],
    );

    for await (const chunk of stream) {
      yield chunk;
    }
  }
}
