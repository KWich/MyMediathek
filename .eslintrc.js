module.exports = {
  "env": {
      "browser": true,
      "es2021": true
  },
  "extends": "eslint:recommended",
  "overrides": [
  ],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "rules": {
    "brace-style": ["error", "stroustrup"],
    "comma-spacing": ["error", {"before": false, "after": true} ],
    "computed-property-spacing": ["error", "never"],
    "eol-last": ["error", "always"],
    "indent": ["warn", 2, {"SwitchCase": 1}],
    "key-spacing": "error", 
    "linebreak-style": ["error", "windows"],
    "no-console" : 1,
    "no-else-return": "error",
    "no-extra-parens": "error",
    "no-lonely-if": "error",
    "no-multiple-empty-lines": ["error", { "max": 2}],
    "no-multi-spaces": "warn",
    //"no-negated-condition": "error",
    "no-param-reassign": "error",
    "no-redeclare": "error",
    "no-tabs": "error",
    "no-trailing-spaces": "warn",
    "no-undef": 1,
    "no-unneeded-ternary": "error",
    "no-unused-vars": "warn",
    "no-var": "error",
    "object-curly-newline": ["error", {"multiline": true}],
    "object-curly-spacing": ["error", "never"],
    "operator-linebreak": ["error", "after"],
    "padding-line-between-statements": [
      "error",
      {"blankLine": "always", "prev": "*", "next": "function"}
    ],
    "quotes": ["error", "double"],
    "semi": ["error", "always"],
    "semi-spacing": "error",
    "semi-style": ["error", "last"],
    "space-before-blocks": "warn",
    "space-infix-ops": "error",
    "vars-on-top": "error"
  }
};
