/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as request from 'supertest';
import { ViabilityIntegration } from '../src/externalIntegration/viability/viability.integration';
import { ViabilityService } from '../src/api/viability/service/viability.service';
import { ViabilityController } from '../src/api/viability/controller/viability.controller';
import { createE2ETestingModule } from '../src/testUtil/unitTest.util';

const MockedViabiityIntegration = {
    consultViability: async () => {},
} as unknown as ViabilityIntegration;

describe('ViabilityController (e2e)', () => {
    let app;
    let integration;

    beforeEach(async () => {
        const moduleFixture = await createE2ETestingModule({
            providers: [ViabilityService, ViabilityIntegration],
            controllers: [ViabilityController],
        })
            .overrideProvider(ViabilityIntegration)
            .useValue(MockedViabiityIntegration)
            .compile();

        integration = await moduleFixture.resolve<ViabilityIntegration>(ViabilityIntegration);

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/ (GET)', async () => {
        jest.spyOn(integration, 'consultViability').mockResolvedValue({ data: '123456', status: 200 });

        return request(app.getHttpServer())
            .post('/viability')
            .expect(201)
            .expect('123456');
    });
});
