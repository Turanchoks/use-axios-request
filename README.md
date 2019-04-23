# use-axios-request :bulb:

![npm-version](https://img.shields.io/npm/v/use-axios-request.svg?maxAge=2592000)
![npm type definitions](https://img.shields.io/npm/types/use-axios-request.svg)

**Data fetching is easy with React Hooks for axios!**

## Features

Make [XMLHttpRequests](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest)
including all features from [axios](https://github.com/axios/axios#features)

Several more nice features:

- Familiar API, axios under the hood
- Request auto-cancellation (concurrent requests or when the component unmounts)
- Cache
- Polling
- Render prop-like API
- Fully typed (TS, Flow is coming)
- Callbacks (`onSuccess`, `onError`) to derive state

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
import React from 'react';
import { useAxiosRequest } from 'use-axios-request';

const Avatar = ({ username }) => {
  const { state } = useAxiosRequest(`https://api.github.com/users/${username}`);

  if (state.isFetching) {
    return 'Loading';
  }

  if (state.error) {
    return state.error.message || 'Error';
  }

  return <img src={state.data.avatar_url} alt="avatar" />;
};
```

Performing a `POST` request

```js
import React from "react";
import { useAxiosRequest } from "use-axios-request";

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

```ts
import { useAxiosRequest } from 'use-axios-request';

// TypeScript annotation for response data
type DataTypeResponse = {
  id: string;
  value: string;
};

const Component = () => {
  const config = 'https://api.github.com/users/octocat';
  // config is just an Axios config that is directly passed to axios() function
  // see https://github.com/axios/axios#request-config
  // if omitted or null is provided no request is sent

  const options = {
    // Milliseconds that determine how often should the data with the same config is polled.
    // No polling occures if 0 is passed. Defaults to 0.
    pollInterval: 0,
    // Boolean. If true, response data will be cached. Internal axios buildURL is used to
    // generate a cache key.
    cache: false,
    // A Callback that is called after a successful response
    onSuccess: () => setShowModal(false),
    // A Callback that is called after an error response
    onError: () => setShowModal(false),
  };

  const {
    // state.data - response.data from latest request
    // state.isFetching - is currently fetching
    // state.error - error from latest request
    // state.requestId - how many requests have been sent with current config
    //                   it increments if you call refresh or use polling
    state,
    // function that sets a new config and triggers a request
    update,
    // re-fetch with existing config
    refresh,
  } = useAxiosRequest<DataTypeResponse>(config, options);
};
```

## Notes

- It's possible to use both `update` method and passing a config as a first argument to the hook in a single component. Keep in mind that using `update` method does not make a component re-render the second time while passing a new config as argument does trigger a second render.
- If you use both methods simultaneously (`update` and passing a config) you might bump into something like this:

```js
const Component = () => {
  const [config, setConfig] = React.useState(
    'https://api.github.com/users/octocat'
  );
  const { update } = useAxiosRequest(config);

  // If you click on 'Use update button', a new request is sent.
  // Then if you lick on 'Use setConfig', nothing happens
  // because literally nothing has changed - you've updated local state
  // to the same value as it was before. useAxiosRequest hook remembers
  // last passed config as an argument and dispatches a new request only
  // if it actually changes.

  return (
    <div>
      <button
        onChange={() => update('https://api.github.com/users/Turanchoks')}
      >
        Use update
      </button>
      <button
        onChange={() => setConfig('https://api.github.com/users/octocat')}
      >
        Use setConfig
      </button>
    </div>
  );
};
```

- If you use polling, it's likely that you don't want to show spinner whenever a polling request occurs. You can use `state.requestId` property which equals `1` on the very first request. So `state.isFetching && state.requestId === 1` is `true` when it's a initial request.

## License

MIT
