// /backend/src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Ambil 'roles' yang kita tentukan di @SetMetadata (lihat langkah 3)
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. Jika endpoint tidak butuh role (misal: publik), izinkan
    if (!requiredRoles) {
      return true;
    }

    // 3. Ambil data 'user' yang sudah disisipkan oleh JwtStrategy
    const { user } = context.switchToHttp().getRequest();

    // 4. Cek apakah role user ada di dalam daftar role yang diizinkan
    return requiredRoles.some((role) => user.role === role);
  }
}