import { emissionFactorRepository } from './repository.js';
import { EmissionFactorDto, CreateEmissionFactorDto } from '@enterprise/shared-types';

export class EmissionFactorService {
  private toDto(record: any): EmissionFactorDto {
    return {
      id: record.id,
      year: record.year,
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

  async list(year?: number): Promise<EmissionFactorDto[]> {
    const records = await emissionFactorRepository.list(year);
    return records.map(this.toDto);
  }

  async bulkUpdate(year: number, factors: Array<{ key: string; value: number }>, userId?: string): Promise<void> {
    await emissionFactorRepository.bulkUpdate(year, factors, userId);
  }

  async clone(fromYear: number, toYear: number, userId?: string): Promise<void> {
    await emissionFactorRepository.clone(fromYear, toYear, userId);
  }

  async create(data: CreateEmissionFactorDto, userId?: string): Promise<EmissionFactorDto> {
    const record = await emissionFactorRepository.create(data, userId);
    return this.toDto(record);
  }

  async initialize(year: number, userId?: string): Promise<void> {
    await emissionFactorRepository.initialize(year, userId);
  }

  async deleteByYear(year: number, userId?: string): Promise<void> {
    await emissionFactorRepository.deleteByYear(year, userId);
  }

  async getById(id: string): Promise<EmissionFactorDto | null> {
    const record = await emissionFactorRepository.findById(id);
    return record ? this.toDto(record) : null;
  }

  async update(id: string, data: { name?: string; value?: number; unit?: string; source?: string | null; sourceUrl?: string | null }, userId?: string): Promise<EmissionFactorDto> {
    const record = await emissionFactorRepository.update(id, data, userId);
    return this.toDto(record);
  }
}
export const emissionFactorService = new EmissionFactorService();

