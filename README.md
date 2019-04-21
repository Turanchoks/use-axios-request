# use-axios-request :bulb:

![npm-version](https://img.shields.io/npm/v/use-axios-request.svg?maxAge=2592000)

**Data fetching is easy with React Hooks for axios!**

## Features

Make [XMLHttpRequests](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest)
including all features from [axios](https://github.com/axios/axios#features)

Several more nice features:

- Cancel a request when it makes sense: component is unmounted, the same new request is started by the same `Component`. You don't need to cancel request manually.
- Cache a response if it's specified with `cache` option.
- Polling data with `pollInterval` option.
- Re-fetch data with the same config.
- Call functions on successfull and error response with `onSuccess` and `error` options.

## Installing

Using npm:

```bash
$ npm install use-axios-request
```

Using yarn:

```bash
$ yarn add use-axios-request
```

## Example

Performing a `GET` request

```js
import React from "react";
import { useAxiosRequest } from "./useAxiosRequest";

const Avatar = ({ username }) => {
  const { state } = useAxiosRequest(`https://api.github.com/users/${username}`);
  if (state.isFetching) return "Loading";
  if (state.error) return state.error.message || "Error";
  if (!state.data) return null;

  return <img src={state.data.avatar_url} alt="avatar" />;
};
```

Performing a `POST` request

```js
import React from "react";
import { useAxiosRequest } from "./useAxiosRequest";

const NewIssue = ({ title, body, owner, repo }) => {
  const { state, update } = useAxiosRequest();

  return (
    <button
      disabled={state.isFetching}
      onClick={() => {
      update({
        url: `https://api.github.com/repos/${owner}/${repo}/issues`
        method: 'post'
        data: {
          title,
          body,
        }
      })
    }}>
      Submit New Issue
    </button>
  );
};
```

## API

```js
import { useAxiosRequest } from "./useAxiosRequest";

type DataType = {
  id: string
};

const Component = () => {
  const [config, setConfig] = React.useState("http://example.com");

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

## License

MIT
