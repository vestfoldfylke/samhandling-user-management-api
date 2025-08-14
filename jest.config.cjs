/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/dist_tests"],
  testMatch: ["**/tests/**/*.test.js"],
  transform: {},
  moduleNameMapper: {}
}
