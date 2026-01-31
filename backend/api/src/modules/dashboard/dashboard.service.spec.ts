import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { DatabaseService } from '../database/database.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let dbService: jest.Mocked<DatabaseService>;

  beforeEach(async () => {
    const mockDbService = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: DatabaseService,
          useValue: mockDbService,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    dbService = module.get(DatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should return dashboard metrics', async () => {
      dbService.query.mockResolvedValue([[{ count: 5 }]]);

      const result = await service.getMetrics(1);

      expect(result).toBeDefined();
      expect(result.totalUsers).toBe(5);
      expect(result.totalXuiInstances).toBe(5);
    });
  });

  describe('getRecentActivity', () => {
    it('should return recent activity', async () => {
      const mockActivity = [
        { action: 'LOGIN', entity_type: 'user', created_at: new Date() },
      ];
      dbService.query.mockResolvedValue(mockActivity);

      const result = await service.getRecentActivity(1);

      expect(result).toEqual(mockActivity);
    });
  });
});
