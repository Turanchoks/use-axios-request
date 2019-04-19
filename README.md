# use-axios-request

![npm-version](https://img.shields.io/npm/v/use-axios-request.svg?maxAge=2592000)

React Hooks for axios

## API

Performing a `GET` request

```js
import { useAxiosRequest } from './useAxiosRequest';

type DataType = {
  id: string,
};

const Component = () => {
  const [config, setConfig] = React.useState('http://example.com');

  const { state, update, refresh } = useAxiosRequest(
    // Axios config that is directly passed to axios() function
    // see https://github.com/axios/axios#request-config
    // if ommited or null is provided no request is sent
    config,
    // options.pollInterval: number - how often re-fetch with current axios config
    // options.cache: boolean - should use cache. Internal axios buildURL is used
    // options.onSuccess: (response.data) => void - callback called on successful request
    // options.error: (error) => void - callback called on error request
    // to generate a cache key.
    options
  );

  // response.data from latest request
  state.data;

  // is currently fetching
  state.isFetching;

  // error from latest request
  state.error;

  // how many requests have been sent with current config
  // it increments if you call refresh or use polling
  state.requestId;

  // function that sets a new config and triggers a request
  update;

  // re-fetch with existing config
  refresh;
};
```
