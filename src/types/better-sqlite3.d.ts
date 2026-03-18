declare module "better-sqlite3" {
  class Database {
    constructor(filename: string);
    pragma(value: string): void;
    exec(sql: string): void;
  }

  export default Database;
}
