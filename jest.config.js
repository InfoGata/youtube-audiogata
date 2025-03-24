/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest/presets/js-with-ts",
  testEnvironment: "./FixJSDOMEnvironment.ts",
  globals: {
    application: {},
  },
  transformIgnorePatterns: [
    "node_modules/(?!(ky)/)"
  ]
};
