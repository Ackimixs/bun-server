import { Database } from "bun:sqlite";
import {GlobalConfig} from "@root/utils/type.ts";
import * as fs from "node:fs";

export class MyDb {
    db: Database;
    config: GlobalConfig;

    constructor(config : GlobalConfig) {
        this.config = config;
        this.db = new Database(Bun.env.DATABASE_URL, { create: true });
    }

    async initialize() {
        this.clearBackup();
        await this.createAndCheckTables()
    }

    get(table: string, fields: string[], where: string = "") {
        return this.db.query(`SELECT ${fields.join(", ")} FROM ${table} ${where ? "WHERE " + where : ""}`).all();
    }

    create(table: string, fields: string[], values: string[]  ) {
        values = values.map(v => `'${v}'`);
        return this.db.query(`INSERT INTO ${table} (${fields.join(", ")}) VALUES (${values.join(", ")}) RETURNING *`).get();
    }

    delete(table: string, where: string) {
        return this.db.query(`DELETE FROM ${table} WHERE ${where} RETURNING *`).get();
    }

    update(table: string, fields: string[], values: string[], where: string) {
        const set = fields.map((f, i) => `${f} = '${values[i]}'`).join(", ");
        return this.db.query(`UPDATE ${table} SET ${set} WHERE ${where} RETURNING *`).get();
    }

    close() {
        this.db.close();
    }

    async updateModels() {
        await this.createAndCheckTables();
    }

    async readModelsFromFile() {
        return Bun.file("./src/database/Models.json", { type: "application/json" }).json();
    }

    generateFieldDefinitions(fields: any) {
        return Object.entries(fields).map(([name, v]: [string, any]) => {
            v = {...this.defaultFields(), ...v};
            return `${name} ${v.type} ${v.primaryKey ? 'PRIMARY KEY' : ''} ${v.autoIncrement ? 'AUTOINCREMENT' : ''} ${v.required ? 'NOT NULL' : ''} ${v.unique ? 'UNIQUE' : ''} ${v.defaultValue ? `DEFAULT ${v.defaultValue}` : ''}`;
        }).join(', ');
    }

    getTableSchema(tableName: string) {
        const table = this.db.query(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`).get();
        if (!table) return null;
        return this.db.query(`PRAGMA table_info('${tableName}')`).all();
    }

    createTable(tableName: string, fields: string) {
        this.db.run(`CREATE TABLE IF NOT EXISTS '${tableName}' (${fields})`);
        console.log(`Table ${tableName} created.`);
    }

    updateTableSchema(tableName: string, fields: string) {
        console.log(`Updating table ${tableName} schema...`);
        this.db.run(`DROP TABLE IF EXISTS '${tableName}'`);
        this.createTable(tableName, fields);
        console.log(`Table ${tableName} schema updated.`);
    }

    checkSchemaChanges(tableName: string, newFields: any, existingTable: any): boolean {
        if (Object.keys(newFields).length !== existingTable.length) return true;

        for (const [i, field] of existingTable.entries()) {
            const newField = {...this.defaultFields(), ...newFields[field.name]};
            if (!newField) return true;
            if (field.type !== newField.type) return true;
            if (field.pk != newField.primaryKey) return true;
            if (field.notnull != newField.required) return true;
        }

        return false;
    }

    defaultFields() {
        return {
            type: "TEXT",
            primaryKey: false,
            autoIncrement: false,
            required: false,
            unique: false,
            defaultValue: null,
        }
    }

    async createAndCheckTables() {
        const models = await this.readModelsFromFile();

        const dbFile = Bun.file(this.config.folder?.database + "/dev.db");

        if (await dbFile.exists()) {
            // Backup the database file
            const timestamp = new Date().toISOString().replace(/:/g, "-");
            await Bun.write(this.config.folder?.database + `/backup/dev-${timestamp}.db`, dbFile);
        }

        for (const modelName in models) {
            const model = models[modelName];
            const fields = this.generateFieldDefinitions(model.fields);

            const existingTable = this.getTableSchema(modelName);
            if (!existingTable) {
                // If table doesn't exist, create it
                this.createTable(modelName, fields);
            } else {
                // Compare table schema with model schema and update if necessary
                const schemaChanged = this.checkSchemaChanges(modelName, model.fields, existingTable);
                if (schemaChanged) {
                    this.updateTableSchema(modelName, fields);
                }
            }
        }
    }

    clearBackup() {
        const dir = fs.readdirSync(this.config.folder?.database + "/backup");
        for (const file of dir) {
            const fileStat = fs.statSync(this.config.folder?.database + "/backup/" + file);
            if (fileStat.isFile() && fileStat.mtimeMs < Date.now() - 1000 * 60 * 60 * 24 * 7) {
                fs.unlinkSync(this.config.folder?.database + "/backup/" + file);
            }
        }
    }
}