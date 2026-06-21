// Test stub for the `server-only` package. The real package has no runtime
// export — it only throws when bundled into a client build. Under vitest there
// is no such bundler boundary, so an empty module lets server query files import
// it and be exercised directly.
export {};
