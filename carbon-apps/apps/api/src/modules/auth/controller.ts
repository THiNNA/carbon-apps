import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from './service.js';
import { buildApiResponse } from '@enterprise/shared-utils';
import { BadRequestError } from '../../common/errors/custom-errors.js';
import { transactionLogService } from '../transaction-logs/service.js';

export class AuthController {
  async login(request: FastifyRequest, reply: FastifyReply) {
    const { email, password } = request.body as any;
    if (!email || !password) {
      throw new BadRequestError('Email and password are required');
    }

    const result = await authService.login(email, password);

    // บันทึกประวัติการล็อกอิน พร้อมกรองข้อมูลความปลอดภัย (Security Filtering)
    const safeBody = { email, password: '******' };
    const safeResponse = {
      user: result.user,
      accessToken: '******',
      refreshToken: '******'
    };

    await transactionLogService.log({
      userId: result.user.id,
      userEmail: result.user.email,
      userName: result.user.name,
      action: 'LOGIN',
      module: 'Auth',
      targetId: result.user.id,
      targetName: `ล็อกอินเข้าสู่ระบบ: ${result.user.name}`,
      requestData: JSON.stringify(safeBody),
      responseData: JSON.stringify(safeResponse),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent']
    });


    return reply.send(

      buildApiResponse({
        success: true,
        message: 'Login successful',
        data: result
      })
    );
  }

  async refresh(request: FastifyRequest, reply: FastifyReply) {
    const { refreshToken } = request.body as any;
    if (!refreshToken) {
      throw new BadRequestError('Refresh token is required');
    }

    const result = await authService.refresh(refreshToken);
    return reply.send(
      buildApiResponse({
        success: true,
        message: 'Tokens refreshed successfully',
        data: result
      })
    );
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(
      buildApiResponse({
        success: true,
        message: 'Logout successful'
      })
    );
  }

  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.userId;
    if (!userId) {
      throw new BadRequestError('User not authenticated');
    }

    const profile = await authService.getProfile(userId);
    return reply.send(
      buildApiResponse({
        success: true,
        message: 'Profile retrieved successfully',
        data: profile
      })
    );
  }

  async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.userId;
    if (!userId) {
      throw new BadRequestError('User not authenticated');
    }

    const { name, email } = request.body as any;
    if (!name || !email) {
      throw new BadRequestError('Name and email are required');
    }

    const updatedUser = await authService.updateProfile(userId, name, email);
    return reply.send(
      buildApiResponse({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email
        }
      })
    );
  }

  async updateSettings(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.userId;
    if (!userId) {
      throw new BadRequestError('User not authenticated');
    }

    const { password } = request.body as any;
    if (!password) {
      throw new BadRequestError('Password is required');
    }

    await authService.updateSettings(userId, password);
    return reply.send(
      buildApiResponse({
        success: true,
        message: 'Password updated successfully'
      })
    );
  }
}
export const authController = new AuthController();
