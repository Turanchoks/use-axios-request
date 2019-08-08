import { useReducer, useEffect, useCallback, ReactNode, useMemo } from 'react';
import * as ReactDOM from 'react-dom';
import Axios, {
  AxiosRequestConfig,
  AxiosError,
  AxiosResponse,
  AxiosPromise,
} from 'axios';
import buildURL from 'axios/lib/helpers/buildURL';

export const Cache = new Map<string, AxiosResponse['data']>();
export const CacheRequests = new Map<string, AxiosPromise>();

// if (process.env.NODE_ENV === 'development') {
//   window.__axiosRequestCache = Cache;
//   window.__axiosRequestRequestsCache = CacheRequests;
// }

type ConfigType = AxiosRequestConfig | string | null | void;

type State<D> = {
  config: ConfigType;
  data: D;
  prevConfig: ConfigType;
  isFetching: boolean;
  error: Error | null;
  requestId: number;
};

function init<D>({
  config,
  cacheKey,
  data,
  prevConfig,
}: {
  config: ConfigType;
  cacheKey: string | null;
  data: D;
  prevConfig: ConfigType;
}): State<D> {
  const hasCache = typeof cacheKey === 'string' && Cache.has(cacheKey);

  return {
    data: cacheKey && hasCache ? Cache.get(cacheKey) : data,
    isFetching: config != null && !hasCache,
    config,
    error: null,
    requestId: 1,
    prevConfig,
  };
}

type Action<D> =
  | {
      type: 'manually set config';
      payload: {
        config: ConfigType;
        cacheKey: string | null;
      };
    }
  | {
      type: 'config changed';
      payload: {
        config: ConfigType;
        cacheKey: string | null;
      };
    }
  | {
      type: 'poll';
    }
  | {
      type: 'fetched';
      payload: D;
    }
  | {
      type: 'error';
      payload: AxiosError;
    };

function reducer<D>(state: State<D>, action: Action<D>): State<D> {
  switch (action.type) {
    case 'manually set config': {
      const { config, cacheKey } = action.payload;

      if (config === state.config) {
        return state;
      }

      return init({
        config,
        cacheKey,
        prevConfig: state.prevConfig,
        data: state.data,
      });
    }
    case 'config changed': {
      const { config, cacheKey } = action.payload;

      if (config === state.prevConfig) {
        return state;
      }

      return init({
        config,
        cacheKey,
        prevConfig: config,
        data: state.data,
      });
    }
    case 'poll':
      return {
        config: state.config,
        data: state.data,
        prevConfig: state.prevConfig,

        isFetching: true,
        error: null,
        requestId: state.requestId + 1,
      };
    case 'fetched':
      return {
        config: state.config,
        prevConfig: state.prevConfig,
        requestId: state.requestId,

        data: action.payload,
        isFetching: false,
        error: null,
      };
    case 'error':
      return {
        config: state.config,
        prevConfig: state.prevConfig,
        requestId: state.requestId,
        data: state.data,

        isFetching: false,
        error: action.payload,
      };
    default:
      return state;
  }
}

type UseAxiosRequestOptionsType<D> = {
  pollInterval?: number;
  cache?: boolean;
  onSuccess?: (data: D) => void;
  onError?: (error: AxiosError) => void;
};

type UseAxiosRequestReturnType<D> = {
  isFetching: boolean;
  requestId: number;
  data: D;
  error: Error | null;
  refresh: () => void;
  update: (config: ConfigType) => void;
  config: ConfigType;
};

export function useAxiosRequest<D>(
  axiosConfig: ConfigType | null | void,
  {
    cache = false,
    pollInterval = 0,
    onSuccess,
    onError,
  }: UseAxiosRequestOptionsType<D> = {}
): UseAxiosRequestReturnType<D> {
  const cacheKey = useMemo(() => {
    if (axiosConfig && cache) {
      return typeof axiosConfig === 'string'
        ? axiosConfig
        : (buildURL(axiosConfig.url, axiosConfig.params) as string);
    }

    return null;
  }, [axiosConfig, cache]);

  const initialValue = {
    config: axiosConfig,
    cacheKey,
    data: null,
    prevConfig: axiosConfig,
  };

  const [state, dispatch] = useReducer(
    reducer,
    initialValue,
    // FIX ME
    init as (iv: typeof initialValue) => State<D>
  );

  const updateConfig = useCallback(
    (config: ConfigType) => {
      dispatch({
        type: 'config changed',
        payload: { config, cacheKey },
      });
    },
    [dispatch, cacheKey]
  );

  const dispatchManullySetConfig = useCallback(
    (config: ConfigType) => {
      dispatch({
        type: 'manually set config',
        payload: { config, cacheKey },
      });
    },
    [dispatch, cacheKey]
  );

  const dispatchFetched = useCallback(
    (data: D) => {
      dispatch({
        type: 'fetched',
        payload: data,
      });
    },
    [dispatch]
  );

  const dispatchError = useCallback(
    (error: AxiosError) => {
      dispatch({
        type: 'error',
        payload: error,
      });
    },
    [dispatch]
  );

  const dispatchPoll = useCallback(() => {
    dispatch({
      type: 'poll',
    });
  }, [dispatch]);

  const cb = useCallback(
    (data: D) => {
      if (typeof onSuccess === 'function') {
        ReactDOM.unstable_batchedUpdates(() => {
          dispatchFetched(data);
          onSuccess(data);
        });
      } else {
        dispatchFetched(data);
      }
    },
    [dispatchFetched, onSuccess]
  );

  const errorCb = useCallback(
    (error: AxiosError) => {
      if (typeof onError === 'function') {
        ReactDOM.unstable_batchedUpdates(() => {
          dispatchError(error);
          onError(error);
        });
      } else {
        dispatchError(error);
      }
    },
    [dispatchError, onError]
  );

  if (state.prevConfig !== axiosConfig) {
    updateConfig(axiosConfig);
  }

  useEffect(() => {
    if (pollInterval > 0 && !state.isFetching) {
      const timeoutId = setTimeout(dispatchPoll, pollInterval);
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [state.isFetching, pollInterval, dispatchPoll]);

  useEffect(() => {
    if (state.config && state.isFetching) {
      const source = Axios.CancelToken.source();
      const axiosConfig: AxiosRequestConfig = {
        cancelToken: source.token,
      };

      if (typeof state.config === 'string') {
        axiosConfig.url = state.config;
        axiosConfig.method = 'GET';
      } else {
        Object.assign(axiosConfig, state.config);
      }

      let request;

      if (cacheKey) {
        const maybeRequest = CacheRequests.get(cacheKey);
        if (maybeRequest) {
          request = maybeRequest;
        } else {
          request = Axios(axiosConfig);
          CacheRequests.set(cacheKey, request);
        }
      } else {
        request = Axios(axiosConfig);
      }

      request
        .then(({ data }) => {
          cb(data);
          if (cacheKey) {
            Cache.set(cacheKey, data);
          }
        })
        .catch(error => {
          if (Axios.isCancel(error)) {
            return;
          }
          errorCb(error);
        })
        .then(() => {
          if (cacheKey) {
            CacheRequests.delete(cacheKey);
          }
        });

      return source.cancel;
    }
  }, [state.config, state.isFetching, cb, errorCb, state.requestId, cacheKey]);

  return {
    isFetching: state.isFetching,
    requestId: state.requestId,
    data: state.data as D,
    error: state.error,
    refresh: dispatchPoll,
    update: dispatchManullySetConfig,
    config: state.config,
  };
}

export function useAxiosRequestRender<D>({
  config,
  options,
  render,
  renderLoading,
  renderError,
}: {
  config: ConfigType;
  render: (axiosConfigReturn: UseAxiosRequestReturnType<D>) => ReactNode;
  renderLoading: (axiosConfigReturn: UseAxiosRequestReturnType<D>) => ReactNode;
  renderError: (axiosConfigReturn: UseAxiosRequestReturnType<D>) => ReactNode;
  options?: UseAxiosRequestOptionsType<D>;
}) {
  const axiosRequest = useAxiosRequest<D>(config, options);

  if (axiosRequest.isFetching && axiosRequest.requestId === 1) {
    return renderLoading(axiosRequest);
  }

  if (axiosRequest.error) {
    return renderError(axiosRequest);
  }

  return render(axiosRequest);
}
