import { IsNotEmpty, IsString, IsUUID, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessageDto {
  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

export class ChatRequestDto {
  @IsNotEmpty()
  @IsUUID()
  document_id: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  conversation_history?: ChatMessageDto[];
}

export class ChatMessageResponseDto {
  id: string;
  role: string;
  content: string;
  chunk_ids: string[];
  created_at: Date;
}

export class ChatHistoryResponseDto {
  session_id: string;
  document_id: string;
  messages: ChatMessageResponseDto[];
}
