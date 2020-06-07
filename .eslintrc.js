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
    "no-multi-spaces": "warn",
    "no-trailing-spaces": "warn",
    "space-infix-ops": "warn",
    "indent": [
      "warn",
      2,
      {
        "SwitchCase": 1,
      }
    ],
    "linebreak-style": [
      "error",
      "windows"
    ],
    "quotes": [
      "error",
      "double"
    ],
    "semi": [
      "error",
      "always"
    ],
    "no-undef": "off",
    "no-var": "error",
    "comma-spacing": [
      "error",
      {
        "before": false,
        "after": true
      }
    ],
    "space-infix-ops": "error",
    "no-console" : [
      "error", 
      { 
        "allow": ["error"] 
      }
    ],
    "no-else-return": "error",
    "no-lonely-if": "error",
    //"no-negated-condition": "error",
    "no-param-reassign": "error",
    "no-redeclare": "error",
    "no-unneeded-ternary": "error",
    "vars-on-top": "error",
  }
};
