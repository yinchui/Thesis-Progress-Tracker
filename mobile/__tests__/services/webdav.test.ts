import {WebDAVService} from '../../src/services/webdav';
import {WebDAVConfig} from '../../src/types';
import {AuthError, NotFoundError, NetworkError} from '../../src/utils/errors';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WebDAVService', () => {
  let webdav: WebDAVService;
  const config: WebDAVConfig = {
    serverUrl: 'https://dav.jianguoyun.com/dav/',
    username: 'test@example.com',
    password: 'test-password',
    dataPath: '/论文管理/data/',
  };

  beforeEach(() => {
    // Mock axios.create to return a mock instance
    const mockAxiosInstance = {
      defaults: {auth: undefined},
      request: jest.fn(),
      get: jest.fn(),
    };
    mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);

    webdav = new WebDAVService();
    webdav.initialize(config);
    jest.clearAllMocks();
  });

  it('should test connection successfully', async () => {
    const mockAxiosInstance = (webdav as any).client;
    mockAxiosInstance.request.mockResolvedValueOnce({status: 200});

    const result = await webdav.testConnection();

    expect(result).toBe(true);
    expect(mockAxiosInstance.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PROPFIND',
        url: 'https://dav.jianguoyun.com/dav/论文管理/data/',
      }),
    );
  });

  it('should get versions successfully', async () => {
    const mockData = {
      schemaVersion: '1.0',
      dataVersion: 1,
      versions: [],
      lastModified: '2026-05-04T10:00:00Z',
    };

    const mockAxiosInstance = (webdav as any).client;
    mockAxiosInstance.get.mockResolvedValueOnce({data: mockData});

    const result = await webdav.getVersions();

    expect(result).toEqual(mockData);
  });

  it('should throw AuthError on 401', async () => {
    const mockAxiosInstance = (webdav as any).client;
    mockAxiosInstance.request.mockRejectedValueOnce({
      response: {status: 401},
    });

    await expect(webdav.testConnection()).rejects.toThrow(AuthError);
  });

  it('should throw NotFoundError on 404', async () => {
    const mockAxiosInstance = (webdav as any).client;
    mockAxiosInstance.request.mockRejectedValueOnce({
      response: {status: 404},
    });

    await expect(webdav.testConnection()).rejects.toThrow(NotFoundError);
  });

  it('should throw NetworkError on connection failure', async () => {
    const mockAxiosInstance = (webdav as any).client;
    mockAxiosInstance.request.mockRejectedValueOnce({
      code: 'ECONNABORTED',
    });

    await expect(webdav.testConnection()).rejects.toThrow(NetworkError);
  });
});
