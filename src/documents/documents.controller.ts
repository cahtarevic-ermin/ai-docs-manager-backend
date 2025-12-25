import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @CurrentUser('id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 })],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    const allowedTypes = ['application/pdf', 'text/plain'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid file type: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}`);
    }

    return this.documentsService.uploadDocument(userId, file);
  }

  @Get()
  async findAll(@CurrentUser('id') userId: string) {
    return this.documentsService.findAllForUser(userId);
  }

  @Get(':id')
  async findOne(@CurrentUser('id') userId: string, @Param('id') documentId: string) {
    return this.documentsService.findOne(userId, documentId);
  }

  @Get(':id/status')
  async getStatus(@CurrentUser('id') userId: string, @Param('id') documentId: string) {
    return this.documentsService.getStatus(userId, documentId);
  }

  @Post(':id/sync')
  async syncDocument(@CurrentUser('id') userId: string, @Param('id') documentId: string) {
    return this.documentsService.syncDocument(userId, documentId);
  }

  @Delete(':id')
  async delete(@CurrentUser('id') userId: string, @Param('id') documentId: string) {
    return this.documentsService.delete(userId, documentId);
  }
}
