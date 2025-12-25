import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LogosService } from '../logos/logos.service';
import { DocumentStatus } from '@prisma/client';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly logosService: LogosService,
  ) {}

  async uploadDocument(userId: string, file: Express.Multer.File) {
    // Upload to Logos service
    const logosResponse = await this.logosService.uploadDocument(file);

    // Create local document record
    const document = await this.prisma.document.create({
      data: {
        user_id: userId,
        filename: file.originalname,
        content_type: file.mimetype,
        logos_id: logosResponse.id,
        status: DocumentStatus.PENDING,
      },
    });

    return {
      id: document.id,
      logos_id: logosResponse.id,
      message: logosResponse.message,
    };
  }

  async findAllForUser(userId: string) {
    return this.prisma.document.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(userId: string, documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.user_id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return document;
  }

  async getStatus(userId: string, documentId: string) {
    const document = await this.findOne(userId, documentId);

    if (!document.logos_id) {
      return {
        id: document.id,
        status: document.status,
        summary: document.summary,
        classification: document.classification,
        error_message: document.error_message,
      };
    }

    // Fetch fresh status from Logos
    const logosStatus = await this.logosService.getDocumentStatus(document.logos_id);

    // Update local record if status changed
    if (logosStatus.status !== document.status) {
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: logosStatus.status as DocumentStatus,
          summary: logosStatus.summary,
          classification: logosStatus.classification,
          error_message: logosStatus.error_message,
        },
      });
    }

    return {
      id: document.id,
      status: logosStatus.status,
      summary: logosStatus.summary,
      classification: logosStatus.classification,
      error_message: logosStatus.error_message,
    };
  }

  async syncDocument(userId: string, documentId: string) {
    const document = await this.findOne(userId, documentId);

    if (!document.logos_id) {
      throw new NotFoundException('Document has no Logos reference');
    }

    const logosDoc = await this.logosService.getDocument(document.logos_id);

    // Update local record
    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: logosDoc.status as DocumentStatus,
        summary: logosDoc.summary,
        classification: logosDoc.classification,
        error_message: logosDoc.error_message,
      },
    });

    return updated;
  }

  async delete(userId: string, documentId: string) {
    const document = await this.findOne(userId, documentId);

    // Delete from Logos if it has a reference
    if (document.logos_id) {
      try {
        await this.logosService.deleteDocument(document.logos_id);
      } catch (error) {
        this.logger.warn(`Failed to delete document from Logos: ${error.message}`);
      }
    }

    // Delete local record
    await this.prisma.document.delete({
      where: { id: documentId },
    });

    return { message: 'Document deleted successfully' };
  }
}
