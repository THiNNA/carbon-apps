import { prisma } from '../../common/database/prisma.js';
import { comparePassword, hashPassword, signToken, verifyToken } from '@enterprise/shared-utils';
import { config } from '../../common/config/env.js';
import { UnauthorizedError, NotFoundError, BadRequestError } from '../../common/errors/custom-errors.js';
import { LoginResponseData, TokenPayload, UserDto } from '@enterprise/shared-types';

export class AuthService {
  async login(email: string, password: string): Promise<LoginResponseData> {
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true }
            }
          }
        },
        department: {
          include: { organization: true }
        }
      }
    });

    if (!user) throw new UnauthorizedError('Invalid email or password');

    const isPasswordMatch = await comparePassword(password, user.password);
    if (!isPasswordMatch) throw new UnauthorizedError('Invalid email or password');

    const permissions = user.role?.rolePermissions.map((rp) => rp.permission.name) || [];
    const roles = user.role ? [user.role.name] : [];
    const organizationId = (user as any).department?.organizationId ?? null;
    const departmentId = user.departmentId ?? null;

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      roles,
      permissions,
      organizationId,
      departmentId
    };

    const accessToken = signToken(payload, config.JWT_ACCESS_SECRET, '15m');
    const refreshToken = signToken(payload, config.JWT_REFRESH_SECRET, '7d');

    const userDto: UserDto = {
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      role: user.role ? {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
        createdAt: user.role.createdAt,
        updatedAt: user.role.updatedAt
      } : null,
      departmentId: user.departmentId,
      department: (user as any).department ? {
        id: (user as any).department.id,
        code: (user as any).department.code,
        name: (user as any).department.name,
        organizationId: (user as any).department.organizationId,
        organization: (user as any).department.organization,
        createdAt: (user as any).department.createdAt,
        updatedAt: (user as any).department.updatedAt
      } : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
      createdBy: user.createdBy,
      updatedBy: user.updatedBy,
      deletedBy: user.deletedBy
    };

    return { accessToken, refreshToken, user: userDto };
  }

  async refresh(token: string) {
    try {
      const payload = verifyToken<TokenPayload>(token, config.JWT_REFRESH_SECRET);
      
      const user = await prisma.user.findFirst({
        where: { id: payload.userId, deletedAt: null },
        include: {
          role: {
            include: {
              rolePermissions: { include: { permission: true } }
            }
          },
          department: { include: { organization: true } }
        }
      });

      if (!user) throw new UnauthorizedError('User not found or disabled');

      const permissions = user.role?.rolePermissions.map((rp) => rp.permission.name) || [];
      const roles = user.role ? [user.role.name] : [];
      const organizationId = (user as any).department?.organizationId ?? null;
      const departmentId = user.departmentId ?? null;

      const newPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
        roles,
        permissions,
        organizationId,
        departmentId
      };

      const accessToken = signToken(newPayload, config.JWT_ACCESS_SECRET, '15m');
      const refreshToken = signToken(newPayload, config.JWT_REFRESH_SECRET, '7d');

      return { accessToken, refreshToken };
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  async getProfile(userId: string): Promise<UserDto> {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      role: user.role ? {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
        permissions: user.role.rolePermissions.map((rp) => ({
          id: rp.permission.id,
          name: rp.permission.name,
          description: rp.permission.description,
          createdAt: rp.permission.createdAt,
          updatedAt: rp.permission.updatedAt
        })),
        createdAt: user.role.createdAt,
        updatedAt: user.role.updatedAt
      } : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
      createdBy: user.createdBy,
      updatedBy: user.updatedBy,
      deletedBy: user.deletedBy
    };
  }

  async updateProfile(userId: string, name: string, email: string) {
    const existing = await prisma.user.findFirst({
      where: { email, NOT: { id: userId }, deletedAt: null }
    });

    if (existing) {
      throw new BadRequestError('Email is already taken');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name, email, updatedBy: userId }
    });

    return updated;
  }

  async updateSettings(userId: string, newPassword?: string) {
    const data: any = { updatedBy: userId };
    if (newPassword) {
      data.password = await hashPassword(newPassword);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data
    });

    return updated;
  }
}
export const authService = new AuthService();
