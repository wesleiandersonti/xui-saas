import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { DatabaseService } from '../database/database.service';

describe('AuditService', () => {
  let service: AuditService;
  let dbService: jest.Mocked<DatabaseService>;

  beforeEach(async () => {
    const mockDbService = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: DatabaseService,
          useValue: mockDbService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    dbService = module.get(DatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create an audit log', async () => {
      const mockResult = { insertId: 1 };
      const mockLog = {
        id: 1,
        tenant_id: 1,
        user_id: 1,
        action: 'TEST_ACTION',
        entity_type: 'test',
        entity_id: null,
        details: null,
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
        created_at: new Date().toISOString(),
      };

      dbService.query
        .mockResolvedValueOnce(mockResult)
        .mockResolvedValueOnce([mockLog]);

      const result = await service.log({
        tenantId: 1,
        userId: 1,
        action: 'TEST_ACTION',
        entityType: 'test',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });

      expect(result).toBeDefined();
      expect(result.action).toBe('TEST_ACTION');
    });
  });
});
