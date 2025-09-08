import { Test, TestingModule } from '@nestjs/testing';
import { PaymentCardService } from './payment-card.service';

describe('PaymentCardService', () => {
  let service: PaymentCardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentCardService],
    }).compile();

    service = module.get<PaymentCardService>(PaymentCardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
