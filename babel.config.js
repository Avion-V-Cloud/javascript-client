module.exports = function (api) {
  api.cache.using(() => process.env.NODE_ENV);

  const env = api.env();
  const presets = [];
  const plugins = [];

  switch (env) {
    case 'development':
    case 'cjs':
    case 'production':
    case 'test':
      presets.push(['@babel/preset-env', {
        'useBuiltIns': 'usage',
        'modules': 'commonjs',
        'corejs': '3',
        'targets': {
          'ie': '10',
          'node': '6'
        },
        exclude: [
          'es.promise'
        ]
      }]);
      plugins.push(['@babel/transform-runtime', {
        'useESModules': false
      }]);
      break;

    default: // es6 build
      presets.push(['@babel/preset-env', {
        'modules': false
      }]);
      plugins.push(
        '@babel/plugin-proposal-object-rest-spread',
        ['@babel/transform-runtime', {
          'useESModules': true
        }]
      );
      break;
  }

  return {
    presets, plugins
  };
};
