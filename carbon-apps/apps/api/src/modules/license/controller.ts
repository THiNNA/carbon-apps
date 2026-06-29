import { FastifyRequest, FastifyReply } from 'fastify';
import { buildApiResponse } from '@enterprise/shared-utils';
import { BadRequestError } from '../../common/errors/custom-errors.js';
import { verifyLicense, getMachineUuid, getLicensePath, getPublicKeyPath } from '../../common/license/license-verifier.js';
import { transactionLogService } from '../transaction-logs/service.js';
import * as fs from 'fs';
import * as path from 'path';

export class LicenseController {
  async getStatus(request: FastifyRequest, reply: FastifyReply) {
    const licensePath = getLicensePath();
    const publicKeyPath = getPublicKeyPath();
    const currentMachineId = getMachineUuid();

    const verifyResult = verifyLicense(licensePath, publicKeyPath);

    if (verifyResult.isValid && verifyResult.licenseData) {
      return reply.send(buildApiResponse({
        success: true,
        message: 'License is valid',
        data: {
          isValid: true,
          message: verifyResult.message,
          customer: verifyResult.licenseData.customer,
          issuedAt: verifyResult.licenseData.issuedAt,
          expiresAt: verifyResult.licenseData.expiresAt,
          maxUsers: verifyResult.licenseData.maxUsers,
          maxOrganizations: verifyResult.licenseData.maxOrganizations,
          hardwareId: verifyResult.licenseData.hardwareId,
          currentMachineId
        }
      }));
    } else {
      return reply.send(buildApiResponse({
        success: true,
        message: 'License is invalid or missing',
        data: {
          isValid: false,
          message: verifyResult.message,
          currentMachineId
        }
      }));
    }
  }

  async activate(request: FastifyRequest, reply: FastifyReply) {
    const { licenseKey } = request.body as any;
    if (!licenseKey) {
      throw new BadRequestError('License key content is required');
    }

    const licensePath = getLicensePath();
    const publicKeyPath = getPublicKeyPath();
    let oldLicenseContent: string | null = null;

    if (fs.existsSync(licensePath)) {
      oldLicenseContent = fs.readFileSync(licensePath, 'utf8');
    }

    try {
      // Ensure folder exists and write license
      fs.mkdirSync(path.dirname(licensePath), { recursive: true });
      fs.writeFileSync(licensePath, licenseKey, 'utf8');

      // Verify the new license
      const verifyResult = verifyLicense(licensePath, publicKeyPath);

      if (!verifyResult.isValid) {
        // Rollback
        if (oldLicenseContent) {
          fs.writeFileSync(licensePath, oldLicenseContent, 'utf8');
        } else {
          fs.unlinkSync(licensePath);
        }
        throw new BadRequestError(`Activation failed: ${verifyResult.message}`);
      }

      // Log transaction
      await transactionLogService.log({
        userId: request.user?.userId || null,
        userEmail: request.user?.email || null,
        userName: request.user?.email || null,
        action: 'UPDATE',
        module: 'System',
        targetId: 'LICENSE',
        targetName: `License activated for ${verifyResult.licenseData?.customer}`,
        oldValue: oldLicenseContent ? 'Existing License' : 'No License',
        newValue: JSON.stringify(verifyResult.licenseData),
        requestData: '******', // hide license key details
        responseData: JSON.stringify(verifyResult.licenseData),
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      });

      return reply.send(buildApiResponse({
        success: true,
        message: 'License activated successfully',
        data: {
          isValid: true,
          message: verifyResult.message,
          customer: verifyResult.licenseData?.customer,
          issuedAt: verifyResult.licenseData?.issuedAt,
          expiresAt: verifyResult.licenseData?.expiresAt,
          maxUsers: verifyResult.licenseData?.maxUsers,
          maxOrganizations: verifyResult.licenseData?.maxOrganizations,
          hardwareId: verifyResult.licenseData?.hardwareId,
          currentMachineId: getMachineUuid()
        }
      }));
    } catch (error: any) {
      // Rollback on parsing or system errors
      if (fs.existsSync(licensePath)) {
        if (oldLicenseContent) {
          fs.writeFileSync(licensePath, oldLicenseContent, 'utf8');
        } else {
          try {
            fs.unlinkSync(licensePath);
          } catch {}
        }
      }
      if (error instanceof BadRequestError) {
        throw error;
      }
      throw new BadRequestError(`Activation failed: ${error.message}`);
    }
  }
}

export const licenseController = new LicenseController();
