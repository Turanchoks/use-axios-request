let cancel = () => {};
const axios = require('axios');

const Axios = jest.fn(config => {
  if (config.error) {
    return axios.get('q');
  }

  const response = {
    data: config.url,
  };

  if (config.delay) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(response);
      }, config.delay);
    });
  }

  return Promise.resolve(response);
});
Axios.CancelToken = {
  source: () => ({
    token: null,
    cancel: () => {
      cancel();
    },
  }),
};
Axios.isCancel = () => false;
export default Axios;
