import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TokensDto } from './dto/tokens.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<TokensDto> {
    const { email, password, name } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password using Argon2
    const password_hash = await argon2.hash(password);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password_hash,
        name,
      },
    });

    // Generate tokens
    return this.generateTokens(user.id, user.email, user.role);
  }

  async login(loginDto: LoginDto): Promise<TokensDto> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await argon2.verify(user.password_hash, password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    return this.generateTokens(user.id, user.email, user.role);
  }

  async logout(userId: string, tokenId: string): Promise<{ message: string }> {
    // Delete the specific refresh token
    await this.prisma.refreshToken.delete({
      where: { id: tokenId },
    });

    return { message: 'Logged out successfully' };
  }

  async refreshTokens(userId: string, oldTokenId: string): Promise<TokensDto> {
    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Delete the old refresh token (rotation)
    await this.prisma.refreshToken.delete({
      where: { id: oldTokenId },
    });

    // Generate new tokens
    return this.generateTokens(user.id, user.email, user.role);
  }

  private async generateTokens(userId: string, email: string, role: string): Promise<TokensDto> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(userId, email, role),
      this.generateRefreshToken(userId, email),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken.token,
    };
  }

  private async generateAccessToken(userId: string, email: string, role: string): Promise<string> {
    const payload = {
      sub: userId,
      email,
      role,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.accessTokenSecret') ?? '',
      expiresIn: '30m',
    });
  }

  private async generateRefreshToken(userId: string, email: string): Promise<{ token: string; id: string }> {
    // Create refresh token record first to get the ID
    const tokenRecord = await this.prisma.refreshToken.create({
      data: {
        token: 'placeholder', // Will be updated
        user_id: userId,
        expires_at: new Date(
          Date.now() + this.parseExpiration(this.configService.get<string>('jwt.refreshTokenExpiration') || '7d'),
        ),
      },
    });

    const payload = {
      sub: userId,
      email,
      tokenId: tokenRecord.id,
    };

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.refreshTokenSecret'),
      expiresIn: '7d',
    });

    // Update the token with actual JWT
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { token: refreshToken },
    });

    return { token: refreshToken, id: tokenRecord.id };
  }

  private parseExpiration(expiration: string): number {
    const unit = expiration.slice(-1);
    const value = parseInt(expiration.slice(0, -1));

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        throw new BadRequestException('Invalid token expiration format');
    }
  }
}
