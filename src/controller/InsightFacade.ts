import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";
import {Dataset} from "../model/Dataset";
import {DatasetProcessor} from "../service/DatasetProcessor";
import fs from "fs-extra";
import {assertTrue} from "../service/Assertions";
import {QueryDataset} from "../model/QueryDataset";
import {CourseSection} from "../model/CourseSection";
import {Room} from "../model/Room";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 */
export default class InsightFacade implements IInsightFacade {
	private datasets: Map<string, Dataset<CourseSection | Room>>;
	private datasetsLoaded: Promise<void>;
	constructor() {
		this.datasets = new Map<string, Dataset<CourseSection | Room>>();
		this.datasetsLoaded = new Promise((resolve, reject) => {
			this.loadDatasetsFromDisk()
				.then((res) => {
					this.datasets = res;
				})
				.catch((e) => {
					console.error("Failed to load datasets from disk:", e);
					this.datasets = new Map<string, Dataset<CourseSection | Room>>();
				})
				.finally(resolve);
		});
	}

	private waitForDatasetsLoaded(): Promise<void> {
		return this.datasetsLoaded;
	}

	private async loadDatasetsFromDisk(): Promise<Map<string, Dataset<CourseSection | Room>>> {
		await fs.ensureDir("./data");
		const files = await fs.readdir("./data"); // Get a list of dataset files

		const ds = new Map<string, Dataset<CourseSection | Room>>();
		const loadPromises = files.map(async (file) => {
			try {
				const filePath = `./data/${file}`;
				const datasetJsonStr = await fs.readFile(filePath, "utf8");
				const dataset = Dataset.fromObject(JSON.parse(datasetJsonStr));
				// console.log(dataset);
				ds.set(dataset.getID(), dataset);
			} catch (error) {
				console.error(`Failed to load dataset from file ${file}:`, error);
				// Skip this file and continue with the rest
			}
		});
		await Promise.all(loadPromises);
		return ds;
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		await this.waitForDatasetsLoaded();
		if (!id || id.trim().length === 0 || id.includes("_")) {
			throw new InsightError("Invalid ID");
		}
		if (kind !== InsightDatasetKind.Sections && kind !== InsightDatasetKind.Rooms) {
			return Promise.reject(new InsightError(`Invalid Dataset Kind = ${kind}`));
		}

		if (this.datasets.has(id)) {
			throw new InsightError("Dataset already exists");
		}
		try {
			let dataset: Dataset<CourseSection | Room>;
			if (kind === InsightDatasetKind.Sections) {
				dataset = await DatasetProcessor.ProcessDatasetSection(id, content, kind);
			} else if (kind === InsightDatasetKind.Rooms) {
				dataset = await DatasetProcessor.ProcessDatasetRoom(id, content, kind);
			} else {
				throw new InsightError("Invalid Dataset Kind");
			}

      // DHRUV's IMPLEMENTATION
			// const dataset = await DatasetProcessor.processDataset(id, content, kind);
			// this.datasets.set(id, dataset);


			this.datasets.set(id, dataset);
			return Array.from(this.datasets.keys());
		} catch (error) {
			throw new InsightError(`Failed to add dataset: ${error}`);
		}
	}

	public async removeDataset(id: string): Promise<string> {
		await this.waitForDatasetsLoaded();
		if (!id || /^\s*$/.test(id) || id.includes("_")) {
			return Promise.reject(new InsightError("Invalid ID"));
		}
		//	has method might be wrong too
		//	maybe loading when writing new instance is wrong.
		if (!this.datasets.has(id)) {
			return Promise.reject(new NotFoundError(`Dataset with id ${id} does not exist`));
		}
		try {
			this.datasets.delete(id);
			const datasetPath = `./data/${id}.json`;
			await fs.remove(datasetPath);
			return id;
		} catch (error) {
			console.error("Failed to remove dataset:", error);
			throw new InsightError(`Error removing dataset: ${error}`);
		}
	}

	private static inferDataSetName(options: unknown): string {
		assertTrue(
			typeof options === "object" && options != null && Object.prototype.hasOwnProperty.call(options, "COLUMNS"),
			'OPTIONS should be an object and have the property "COLUMNS"',
			InsightError
		);
		const columns = (options as {COLUMNS: unknown}).COLUMNS;
		assertTrue(
			Array.isArray(columns) && columns.length > 0,
			"OPTIONS.COLUMNS should be a nonempty array",
			InsightError
		);
		const firstColumn = (columns as unknown[])[0];
		assertTrue(
			typeof firstColumn === "string",
			"First element of OPTIONS.COLUMNS will be a string only",
			InsightError
		);
		const splitFirstColumn = (firstColumn as string).split("_");
		assertTrue(
			splitFirstColumn.length === 2,
			"First element of OPTIONS.COLUMNS will be in the form of 'key'_'value'",
			InsightError
		);
		const dataSetName = splitFirstColumn[0];
		return dataSetName;
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		await this.waitForDatasetsLoaded();
		// validation that query is top level valid
		assertTrue(
			typeof query === "object" &&
			query != null &&
			((Object.keys(query as object).length === 2 &&
				Object.prototype.hasOwnProperty.call(query, "WHERE") &&
				Object.prototype.hasOwnProperty.call(query, "OPTIONS")) ||
				(Object.keys(query as object).length === 3 &&
					Object.prototype.hasOwnProperty.call(query, "WHERE") &&
					Object.prototype.hasOwnProperty.call(query, "OPTIONS") &&
					Object.prototype.hasOwnProperty.call(query, "TRANSFORMATIONS"))),
			'Query should be an object with keys "WHERE" and "OPTIONS" (and potentially "TRANSFORMATIONS")',
			InsightError
		);
		const validQuery = query as {WHERE: unknown; OPTIONS: unknown, TRANSFORMATIONS?: unknown};

		// load data from disk (hopefully it has already been parsed by addDataset)
		// this is very cringe but required because of bad design (EBNF)
		const dataset =  this.datasets.get(InsightFacade.inferDataSetName(validQuery.OPTIONS));
		if(dataset === undefined) {
			throw new InsightError("Dataset not found");
		}
		const queryDataset = new QueryDataset(dataset);
		queryDataset.queryWhere(validQuery.WHERE);
		if(validQuery.TRANSFORMATIONS !== undefined) {
			queryDataset.queryTransformations(validQuery.TRANSFORMATIONS);
		}
		return queryDataset.exportWithOptions(validQuery.OPTIONS);
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		// Iterate through all datasets in the map
		await this.waitForDatasetsLoaded();
		const insightDatasets: InsightDataset[] = Array.from(this.datasets.entries()).map(
			([id, dataset]): InsightDataset => ({
				id: dataset.getID(),
				kind: dataset.getKind(),
				numRows: dataset.getEntries().length,
			})
		);
		return insightDatasets;
	}
}
