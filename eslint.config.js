// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'lib',
    e18e: false,
  },
  {
    rules: {
      'antfu/consistent-list-newline': 'off',
      'ts/no-unsafe-declaration-merging': 'off',
      'eslint-comments/no-unlimited-disable': 'off',
    },
  },
)
