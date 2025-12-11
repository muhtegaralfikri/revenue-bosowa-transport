import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

describe('AuthService', () => {
  let service: AuthService;
  const usersServiceMock = {
    findOneByEmail: jest.fn(),
    findOneById: jest.fn(),
  };
  const jwtServiceMock = {
    sign: jest.fn().mockReturnValue('access-jwt'),
  };
  const configServiceMock = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const overrides: Record<string, string> = {
        JWT_ACCESS_TTL_SECONDS: '86400',
        JWT_REFRESH_TTL_SECONDS: '604800',
      };
      return overrides[key] ?? defaultValue;
    }),
  };
  const refreshRepoMock = {
    update: jest.fn().mockResolvedValue(undefined),
    create: jest.fn().mockImplementation((payload) => payload),
    save: jest
      .fn()
      .mockImplementation(async (entity) => ({ ...entity, id: 'token-id' })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersServiceMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
        {
          provide: getRepositoryToken(RefreshTokenEntity),
          useValue: refreshRepoMock,
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('validateUser', () => {
    it('returns user payload when password matches', async () => {
      const hashed = await bcrypt.hash('password123', 10);
      usersServiceMock.findOneByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'admin@example.com',
        username: 'Admin',
        password: hashed,
      });

      const payload = await service.validateUser('admin@example.com', 'password123');
      expect(payload).toMatchObject({ email: 'admin@example.com' });
    });

    it('returns null for invalid password', async () => {
      const hashed = await bcrypt.hash('password123', 10);
      usersServiceMock.findOneByEmail.mockResolvedValue({
        password: hashed,
      });

      const payload = await service.validateUser('admin@example.com', 'wrong');
      expect(payload).toBeNull();
    });
  });

  describe('login', () => {
    it('issues access & refresh tokens', async () => {
      const randomSpy = jest.spyOn(crypto, 'randomBytes');
      (randomSpy as unknown as jest.SpyInstance<Buffer, [number]>).mockReturnValue(
        Buffer.from('my-secret'),
      );

      usersServiceMock.findOneById.mockResolvedValue({
        id: 'user-1',
        email: 'admin@example.com',
        username: 'Admin',
      });

      const result = await service.login({ id: 'user-1' } as any);

      expect(jwtServiceMock.sign).toHaveBeenCalledWith({
        username: 'Admin',
        sub: 'user-1',
      });
      expect(result.accessToken).toBe('access-jwt');
      expect(result.refreshToken).toContain('token-id.');
      expect(result.expiresIn).toBe(86400);

      randomSpy.mockRestore();
    });
  });
});
