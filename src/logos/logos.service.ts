import { Injectable, HttpException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import FormData from 'form-data';
import { DocumentStatus } from '@prisma/client';

export interface LogosDocument {
  id: string;
  filename: string;
  content_type: string;
  status: string;
  summary: string | null;
  classification: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface LogosUploadResponse {
  id: string;
  message: string;
}

export interface LogosStatusResponse {
  id: string;
  status: string;
  summary: string | null;
  classification: string | null;
  error_message: string | null;
}

@Injectable()
export class LogosService {
  private readonly logger = new Logger(LogosService.name);

  constructor(private readonly httpService: HttpService) {}

  async uploadDocument(file: Express.Multer.File): Promise<LogosUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const response = await firstValueFrom(
        this.httpService.post<LogosUploadResponse>('/documents/upload', formData, {
          headers: formData.getHeaders(),
        }),
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to upload document to Logos');
    }
  }

  async getDocumentStatus(logosId: string): Promise<LogosStatusResponse> {
    try {
      const response = await firstValueFrom(this.httpService.get<LogosStatusResponse>(`/documents/${logosId}/status`));
      return {
        ...response.data,
        status: response.data.status?.toUpperCase() as DocumentStatus,
      };
    } catch (error) {
      this.handleError(error, 'Failed to get document status from Logos');
    }
  }

  async getDocument(logosId: string): Promise<LogosDocument> {
    try {
      const response = await firstValueFrom(this.httpService.get<LogosDocument>(`/documents/${logosId}`));
      return {
        ...response.data,
        status: response.data.status?.toUpperCase() as DocumentStatus,
      };
    } catch (error) {
      this.handleError(error, 'Failed to get document from Logos');
    }
  }

  async deleteDocument(logosId: string): Promise<void> {
    try {
      await firstValueFrom(this.httpService.delete(`/documents/${logosId}`));
    } catch (error) {
      this.handleError(error, 'Failed to delete document from Logos');
    }
  }

  async *chatStream(
    logosDocumentId: string,
    message: string,
    conversationHistory: { role: string; content: string }[] = [],
  ): AsyncGenerator<string> {
    const response = await firstValueFrom(
      this.httpService.post(
        '/chat',
        {
          document_id: logosDocumentId,
          message,
          conversation_history: conversationHistory,
        },
        {
          responseType: 'stream',
        },
      ),
    );

    const stream = response.data;

    for await (const chunk of stream) {
      yield chunk.toString();
    }
  }

  private handleError(error: unknown, message: string): never {
    console.log(error);
    if (error instanceof AxiosError) {
      this.logger.error(`${message}: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
      throw new HttpException(error.response?.data?.detail || message, error.response?.status || 500);
    }
    this.logger.error(`${message}: ${error}`);
    throw new HttpException(message, 500);
  }
}
