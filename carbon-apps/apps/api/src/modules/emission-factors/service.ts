import { emissionFactorRepository } from './repository.js';
import { EmissionFactorDto, CreateEmissionFactorDto } from '@enterprise/shared-types';

export class EmissionFactorService {
  private toDto(record: any): EmissionFactorDto & { organizationId: string } {
    return {
      id: record.id,
      year: record.year,
      organizationId: record.organizationId,
      category: record.category,
      key: record.key,
      name: record.name,
      value: record.value,
      unit: record.unit,
      source: record.source ?? null,
      sourceUrl: record.sourceUrl ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
      createdBy: record.createdBy,
      updatedBy: record.updatedBy,
      deletedBy: record.deletedBy
    };
  }

  async listGroups() {
    return emissionFactorRepository.listGroups();
  }

  async list(year?: number, organizationId?: string): Promise<any[]> {
    const records = await emissionFactorRepository.list(year, organizationId);
    return records.map(r => this.toDto(r));
  }

  async bulkUpdate(year: number, organizationId: string, factors: Array<{ key: string; value: number }>, userId?: string): Promise<void> {
    await emissionFactorRepository.bulkUpdate(year, organizationId, factors, userId);
  }

  async clone(fromYear: number, fromOrgId: string, toYear: number, toOrgId: string, userId?: string): Promise<void> {
    await emissionFactorRepository.clone(fromYear, fromOrgId, toYear, toOrgId, userId);
  }

  async create(data: CreateEmissionFactorDto & { organizationId: string }, userId?: string): Promise<any> {
    const record = await emissionFactorRepository.create(data, userId);
    return this.toDto(record);
  }

  async initialize(year: number, organizationId: string, userId?: string): Promise<void> {
    await emissionFactorRepository.initialize(year, organizationId, userId);
  }

  async deleteByYearAndOrg(year: number, organizationId: string, userId?: string): Promise<void> {
    await emissionFactorRepository.deleteByYearAndOrg(year, organizationId, userId);
  }

  async getById(id: string): Promise<any | null> {
    const record = await emissionFactorRepository.findById(id);
    return record ? this.toDto(record) : null;
  }

  async update(id: string, data: { name?: string; value?: number; unit?: string; source?: string | null; sourceUrl?: string | null }, userId?: string): Promise<any> {
    const record = await emissionFactorRepository.update(id, data, userId);
    return this.toDto(record);
  }

  // ─── System Defaults (SYSTEM org) ────────────────────────────────────────
  async getSystemOrgId(): Promise<string | null> {
    return emissionFactorRepository.getSystemOrgId();
  }

  async listSystemDefaults(year?: number): Promise<any[]> {
    const systemOrgId = await emissionFactorRepository.getSystemOrgId();
    if (!systemOrgId) return [];
    const records = await emissionFactorRepository.list(year, systemOrgId);
    return records.map(r => this.toDto(r));
  }

  async initializeSystemDefaults(year: number, userId?: string): Promise<void> {
    const systemOrgId = await emissionFactorRepository.getSystemOrgId();
    if (!systemOrgId) throw new Error('System organization not found');
    await emissionFactorRepository.initialize(year, systemOrgId, userId);
  }
}
export const emissionFactorService = new EmissionFactorService();
