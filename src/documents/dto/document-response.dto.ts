import { DocumentStatus } from '@prisma/client';

export class DocumentResponseDto {
  id: string;
  filename: string;
  content_type: string;
  status: DocumentStatus;
  summary: string | null;
  classification: string | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}
