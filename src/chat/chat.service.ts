import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LogosService } from '../logos/logos.service';
import { DocumentStatus } from '@prisma/client';
import { ChatRequestDto, ChatHistoryResponseDto } from './dto/chat.dto';

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

  // Get or create chat session for a document
  private async getOrCreateSession(documentId: string) {
    let session = await this.prisma.chatSession.findUnique({
      where: { document_id: documentId },
    });

    if (!session) {
      session = await this.prisma.chatSession.create({
        data: { document_id: documentId },
      });
    }

    return session;
  }

  // Get chat history for a document
  async getChatHistory(userId: string, documentId: string): Promise<ChatHistoryResponseDto> {
    await this.validateDocumentAccess(userId, documentId);

    const session = await this.prisma.chatSession.findUnique({
      where: { document_id: documentId },
      include: {
        messages: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!session) {
      return {
        session_id: '',
        document_id: documentId,
        messages: [],
      };
    }

    return {
      session_id: session.id,
      document_id: documentId,
      messages: session.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        chunk_ids: m.chunk_ids,
        created_at: m.created_at,
      })),
    };
  }

  // Clear chat history for a document
  async clearChatHistory(userId: string, documentId: string): Promise<void> {
    await this.validateDocumentAccess(userId, documentId);

    await this.prisma.chatSession.deleteMany({
      where: { document_id: documentId },
    });
  }

  // Save a message to the session
  async saveMessage(documentId: string, role: 'user' | 'assistant', content: string, chunkIds: string[] = []) {
    const session = await this.getOrCreateSession(documentId);

    return this.prisma.chatMessage.create({
      data: {
        session_id: session.id,
        role,
        content,
        chunk_ids: chunkIds,
      },
    });
  }

  async *streamChat(userId: string, chatRequest: ChatRequestDto) {
    const document = await this.validateDocumentAccess(userId, chatRequest.document_id);

    // Save user message
    await this.saveMessage(chatRequest.document_id, 'user', chatRequest.message);

    // Get existing history from DB for context
    const history = await this.getChatHistory(userId, chatRequest.document_id);
    const conversationHistory = history.messages
      .slice(0, -1) // Exclude the message we just saved
      .map((m) => ({ role: m.role, content: m.content }));

    // Stream from Logos service
    const stream = this.logosService.chatStream(document.logos_id!, chatRequest.message, conversationHistory);

    let fullResponse = '';
    let chunkIds: string[] = [];

    for await (const chunk of stream) {
      // Parse chunk to accumulate full response
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              fullResponse += data.content;
            }
            if (data.chunk_ids) {
              chunkIds = data.chunk_ids;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
      yield chunk;
    }

    // Save assistant response after streaming completes
    if (fullResponse) {
      await this.saveMessage(chatRequest.document_id, 'assistant', fullResponse, chunkIds);
    }
  }
}
