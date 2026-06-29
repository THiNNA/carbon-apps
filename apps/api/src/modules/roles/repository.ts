import { prisma } from '../../common/database/prisma.js';
import { CreateRoleDto, UpdateRoleDto } from '@enterprise/shared-types';

export class RoleRepository {
  async list({
    page,
    limit,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  }: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const where: any = {};

    if (search) {
      where.name = { contains: search };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.role.findMany({
        where,
        include: {
          rolePermissions: {
            include: {
              permission: true
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip,
        take: limit
      }),
      prisma.role.count({ where })
    ]);

    return { items, total };
  }

  async findById(id: string) {
    return prisma.role.findFirst({
      where: {
        id
      },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    });
  }

  async findByName(name: string) {
    return prisma.role.findFirst({
      where: {
        name
      }
    });
  }

  async create(data: CreateRoleDto, creatorId?: string) {
    return prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          name: data.name,
          description: data.description,
          createdBy: creatorId
        }
      });

      if (data.permissionIds && data.permissionIds.length > 0) {
        const rolePermissionsData = data.permissionIds.map((pId) => ({
          roleId: role.id,
          permissionId: pId,
          createdBy: creatorId
        }));
        await tx.rolePermission.createMany({
          data: rolePermissionsData
        });
      }

      return tx.role.findUnique({
        where: { id: role.id },
        include: {
          rolePermissions: {
            include: {
              permission: true
            }
          }
        }
      });
    });
  }

  async update(id: string, data: UpdateRoleDto, updaterId?: string) {
    return prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          updatedBy: updaterId
        }
      });

      if (data.permissionIds !== undefined) {
        await tx.rolePermission.deleteMany({
          where: { roleId: id }
        });

        if (data.permissionIds.length > 0) {
          const rolePermissionsData = data.permissionIds.map((pId) => ({
            roleId: id,
            permissionId: pId,
            createdBy: updaterId
          }));
          await tx.rolePermission.createMany({
            data: rolePermissionsData
          });
        }
      }

      return tx.role.findUnique({
        where: { id },
        include: {
          rolePermissions: {
            include: {
              permission: true
            }
          }
        }
      });
    });
  }

  async delete(id: string) {
    return prisma.role.delete({
      where: { id }
    });
  }
}
export const roleRepository = new RoleRepository();
