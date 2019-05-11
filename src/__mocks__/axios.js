const Axios = jest.fn(config => {
  if (config.error) {
    return Promise.reject(new Error('Error message'));
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
  }),
};
Axios.isCancel = () => false;
export default Axios;
