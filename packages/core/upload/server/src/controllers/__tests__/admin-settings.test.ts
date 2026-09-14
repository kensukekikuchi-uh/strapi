import type { Context } from 'koa';

import adminSettingsController from '../admin-settings';
import { getService } from '../../utils';

jest.mock('../../utils');

const mockGetService = getService as jest.MockedFunction<typeof getService>;

const STORED_SETTINGS = {
  sizeOptimization: true,
  responsiveDimensions: true,
  autoOrientation: false,
  aiMetadata: true,
};

const buildContext = (): Partial<Context> => ({
  state: {
    userAbility: {
      cannot: jest.fn().mockReturnValue(false),
    },
  },
  forbidden: jest.fn(),
});

const mockHasProvider = jest.fn();

describe('Admin Settings Controller - getSettings read-only echoes', () => {
  let configuredConcurrency: number | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    configuredConcurrency = undefined;
    mockHasProvider.mockReturnValue(false);

    mockGetService.mockImplementation((name) => {
      if (name === 'aiMetadataProvider') {
        return { hasProvider: mockHasProvider } as never;
      }

      return { getSettings: jest.fn().mockResolvedValue(STORED_SETTINGS) } as never;
    });

    global.strapi = {
      config: {
        get: jest.fn(() => ({ concurrentUploadRequests: configuredConcurrency })),
      },
    } as never;
  });

  test('echoes the configured value alongside the stored settings', async () => {
    configuredConcurrency = 5;
    const ctx = buildContext();

    await adminSettingsController.getSettings(ctx as Context);

    expect(ctx.body).toEqual({
      data: { ...STORED_SETTINGS, concurrentUploadRequests: 5, aiMetadataAvailable: false },
    });
  });

  test('defaults to 1 (sequential) when the config does not set it', async () => {
    const ctx = buildContext();

    await adminSettingsController.getSettings(ctx as Context);

    expect(ctx.body).toEqual({
      data: { ...STORED_SETTINGS, concurrentUploadRequests: 1, aiMetadataAvailable: false },
    });
  });

  test('echoes whether an AI metadata provider is registered', async () => {
    mockHasProvider.mockReturnValue(true);
    const ctx = buildContext();

    await adminSettingsController.getSettings(ctx as Context);

    expect(ctx.body).toEqual({
      data: { ...STORED_SETTINGS, concurrentUploadRequests: 1, aiMetadataAvailable: true },
    });
  });
});
