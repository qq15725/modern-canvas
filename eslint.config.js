// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'lib',
  },
  {
    rules: {
      'antfu/consistent-list-newline': ['off'],
      'ts/no-unsafe-declaration-merging': ['off'],
      'eslint-comments/no-unlimited-disable': ['off'],
    },
  },
)
