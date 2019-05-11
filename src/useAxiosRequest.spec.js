import Axios from 'axios';
import { useAxiosRequest } from './useAxiosRequest';
import { renderHook, cleanup } from 'react-hooks-testing-library';

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

const initialConfig = {
  url: 'https://github.com',
  method: 'GET',
};

const newConfig = {
  url: 'https://google.com',
  method: 'GET',
};

// const longConfig = {
//   url: 'https://long.com',
//   method: 'GET',
//   delay: 100,
// };

const errorConfig = {
  error: true,
};

describe('useAxiosRequest', () => {
  it('does nothing without init config', () => {
    const { result } = renderHook(useAxiosRequest);
    expect(result.current.data).toEqual(null);
    expect(result.current.isFetching).toEqual(false);
    expect(result.current.error).toEqual(null);
    expect(result.current.requestId).toEqual(1);
  });

  it('changes isFetching flag', async () => {
    const { result, waitForNextUpdate } = renderHook(useAxiosRequest, {
      initialProps: initialConfig,
    });
    expect(result.current.isFetching).toBe(true);
    await waitForNextUpdate();
    expect(result.current.isFetching).toBe(false);
  });

  it('returns response in data object', async () => {
    const { result, waitForNextUpdate } = renderHook(useAxiosRequest, {
      initialProps: initialConfig,
    });
    await waitForNextUpdate();
    expect(result.current.data).toBe(initialConfig.url);
  });

  it('sends request with the same config on refresh()', async () => {
    const { result, waitForNextUpdate } = renderHook(useAxiosRequest, {
      initialProps: initialConfig,
    });
    expect(result.current.requestId).toBe(1);
    expect(result.current.isFetching).toBe(true);

    await waitForNextUpdate();
    result.current.refresh();

    expect(result.current.requestId).toBe(2);
    expect(result.current.isFetching).toBe(true);

    await waitForNextUpdate();

    expect(Axios).toHaveBeenCalledTimes(2);
  });

  it('updates config manually with update()', async () => {
    const { result, waitForNextUpdate } = renderHook(useAxiosRequest, {
      initialProps: initialConfig,
    });

    await waitForNextUpdate();
    expect(result.current.data).toEqual(initialConfig.url);

    result.current.update(newConfig);

    await waitForNextUpdate();
    expect(result.current.data).toEqual(newConfig.url);

    expect(Axios).toHaveBeenCalledTimes(2);
  });

  it('updates config on rerender', async () => {
    const { result, rerender, waitForNextUpdate } = renderHook(
      useAxiosRequest,
      {
        initialProps: initialConfig,
      }
    );

    expect(result.current.isFetching).toBe(true);
    expect(result.current.requestId).toBe(1);

    await waitForNextUpdate();

    expect(result.current.data).toEqual(initialConfig.url);
    expect(result.current.isFetching).toBe(false);

    rerender(newConfig);

    expect(result.current.isFetching).toBe(true);
    expect(result.current.requestId).toBe(1);

    await waitForNextUpdate();

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBe(newConfig.url);
  });

  it('returns errors', async () => {
    const { result, waitForNextUpdate } = renderHook(useAxiosRequest, {
      initialProps: errorConfig,
    });

    await waitForNextUpdate();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error.message).toBe('Error message');
  });

  it('recovers from error', async () => {
    const { result, waitForNextUpdate, rerender } = renderHook(
      useAxiosRequest,
      {
        initialProps: errorConfig,
      }
    );

    await waitForNextUpdate();
    rerender(initialConfig);

    await waitForNextUpdate();
    expect(result.current.error).toBe(null);
    expect(result.current.data).toBe(initialConfig.url);
  });

  it('calls onSuccess callback', async () => {
    const onSuccess = jest.fn();
    const { waitForNextUpdate } = renderHook(
      config =>
        useAxiosRequest(config, {
          onSuccess,
        }),
      {
        initialProps: initialConfig,
      }
    );

    await waitForNextUpdate();
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(initialConfig.url);
  });

  it('returns data from cache', async () => {
    const { rerender, waitForNextUpdate } = renderHook(
      config => useAxiosRequest(config, { cache: true }),
      {
        initialProps: initialConfig,
      }
    );

    await waitForNextUpdate();
    rerender(newConfig);

    await waitForNextUpdate();
    rerender(initialConfig);

    expect(Axios).toHaveBeenCalledTimes(2);
  });
});
