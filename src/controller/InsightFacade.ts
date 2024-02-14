import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError
} from "./IInsightFacade";
import {Dataset} from "../model/Dataset";
import {DatasetProcessor} from "../service/DatasetProcessor";
import fs from "fs-extra";
import {
	CourseSection, CourseSectionNumericalKeyList,
	CourseSectionNumericalKeys, CourseSectionStringKeyList, CourseSectionStringKeys,
	CourseSelectionKey,
	CourseSelectionKeyList
} from "../model/CourseSection";
import {assertTrue} from "../service/Assertions";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private datasets: Map<string, Dataset>;
	constructor() {
		try {
			this.datasets = this.loadDatasetsFromDisk();
		} catch (e) {
			console.error("Failed to load datasets from disk:", e);
			this.datasets = new Map<string, Dataset>();
		}
	}

	private loadDatasetsFromDisk(): Map<string, Dataset> {
		fs.ensureDirSync("./data");
		const files = fs.readdirSync("./data"); // Get a list of dataset files

		const ds = new Map<string, Dataset>();
		files.map((file) => {
			try {
				const filePath = `./data/${file}`;
				const datasetJsonStr = fs.readFileSync(filePath, "utf8");
				// const dataset = JSON.parse(datasetJsonStr);
				// this.datasets.set(dataset.id, dataset);
				const dataset = Dataset.fromObject(JSON.parse(datasetJsonStr));
				ds.set(dataset.getID(), dataset);
			} catch (error) {
				console.error(`Failed to load dataset from file ${file}:`, error);
				// Skip this file and continue with the rest
			}
		});
		return ds;
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (!id || id.trim().length === 0 || id.includes("_")) {
			throw new InsightError("Invalid ID");
		}
		if (kind !== InsightDatasetKind.Sections) {
			return Promise.reject(new InsightError("Invalid Dataset Kind"));
		}
		if (this.datasets.has(id)) {
			throw new InsightError("Dataset already exists");
		}
		try {
			const dataset = await DatasetProcessor.ProcessDataset(id, content, kind);
			this.datasets.set(id, dataset);

			return Array.from(this.datasets.keys());
		} catch (error) {
			throw new InsightError(`Failed to add dataset: ${error}`);
		}
	}

	public async removeDataset(id: string): Promise<string> {
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

	private static isLogicalComparison(key: string): boolean {
		return key === "AND" || key === "OR";
	}

	private static isMComparison(key: string): boolean {
		return key === "GT" || key === "LT" || key === "EQ";
	}

	private static isSComparison(key: string): boolean {
		return key === "IS";
	}

	private static handle_m_comparison(dataKey: string, dataVal: unknown, rootFilterObjKey: string) {
		assertTrue(CourseSectionNumericalKeyList.includes(dataKey),
			`Key of inner object of Comparison should be a valid key, is of key "${dataKey}"`, InsightError);
		const dataKeyNumerical = dataKey as CourseSectionNumericalKeys;
		assertTrue(typeof dataVal === "number",
			"Key of inner object of Comparison should be a string", InsightError);
		const dataValNum = dataVal as number;

		switch (rootFilterObjKey) {
			case "GT": return (section: CourseSection) => section[dataKeyNumerical] > dataValNum;
			case "LT": return (section: CourseSection) => section[dataKeyNumerical] < dataValNum;
			case "EQ": return (section: CourseSection) => section[dataKeyNumerical] === dataValNum;
			default: throw new SyntaxError("Code should be unreachable: Invalid MComparison Key");
		}
	}

	private static handle_s_comparison(dataKey: string, dataVal: unknown, rootFilterObjKey: string) {
		assertTrue(CourseSectionStringKeyList.includes(dataKey),
			"Key of inner object of Comparison should be a valid key", InsightError);
		const dataKeyString = dataKey as CourseSectionStringKeys;
		assertTrue(typeof dataVal === "string",
			"Key of inner object of Comparison should be a string", InsightError);
		const dataValStr = dataVal as string;

		const isFrontWildcard = dataValStr.startsWith("*"), isEndWildcard = dataValStr.endsWith("*");
		let dataValStrNoWildcards: string;
		if (isFrontWildcard && isEndWildcard) {
			dataValStrNoWildcards = dataValStr.slice(1, -1);
		} else if (isFrontWildcard) {
			dataValStrNoWildcards = dataValStr.slice(1);
		} else if (isEndWildcard) {
			dataValStrNoWildcards = dataValStr.slice(0, -1);
		} else {
			dataValStrNoWildcards = dataValStr;
		}

		assertTrue(dataValStrNoWildcards.includes("*") === false, "Invalid wildcard placement", InsightError);

		if (isFrontWildcard && isEndWildcard) {
			return (section: CourseSection) => section[dataKeyString].includes(dataValStrNoWildcards);
		} else if (isFrontWildcard) {
			return (section: CourseSection) => section[dataKeyString].endsWith(dataValStrNoWildcards);
		} else if (isEndWildcard) {
			return (section: CourseSection) => section[dataKeyString].startsWith(dataValStrNoWildcards);
		} else {
			return (section: CourseSection) => section[dataKeyString] === dataValStr;
		}
	}

	private static handle_comparison(innerVal: unknown, unifiedDatasetName: string, rootFilterObjKey: string):
		(section: CourseSection) => boolean {
		assertTrue(typeof innerVal === "object",
			"Inner object of Comparison should be an object", InsightError);
		const innerObj = innerVal as object;
		const innerObjKVs = Object.entries(innerObj);
		assertTrue(innerObjKVs.length === 1,
			"Inner object of Comparison should only have one key", InsightError);
		const [dataKeyFull, dataVal] = innerObjKVs[0];

		const splitDataKeyFull = dataKeyFull.split("_");
		assertTrue(splitDataKeyFull.length === 2,
			"Key of inner object of Comparison should be in the form of 'key'_'value'" + dataKeyFull, InsightError
		);
		const [dataSetName, dataKey] = splitDataKeyFull;
		assertTrue(dataSetName === unifiedDatasetName, "Must only query one dataset", InsightError);

		// MCOMPARISON
		if (InsightFacade.isMComparison(rootFilterObjKey)) {
			return InsightFacade.handle_m_comparison(dataKey, dataVal, rootFilterObjKey);
		} else if (InsightFacade.isSComparison(rootFilterObjKey)) { // SCOMPARISON
			return InsightFacade.handle_s_comparison(dataKey, dataVal, rootFilterObjKey);
		}
		throw new SyntaxError(`Code should be unreachable: Invalid Comparison Key, ${rootFilterObjKey}`);
	}

	private static generateQueryFilterFunction(filter: unknown, unifiedDatasetName: string):
		(section: CourseSection) => boolean {
		assertTrue(typeof filter === "object", "Filter object should be an object", InsightError);
		const filterobj: object = filter as object;

		if (Object.keys(filterobj).length === 0) {
			return () => true;
		}

		assertTrue(Object.keys(filterobj).length === 1,
			"Filter object should only have at most one key", InsightError); // throw an error later
		const rootFilterObjKey = Object.keys(filterobj)[0];

		const innerVal: unknown = (filterobj as {[key: string]: unknown})[rootFilterObjKey];
		// Comparisons
		if (InsightFacade.isMComparison(rootFilterObjKey) || InsightFacade.isSComparison(rootFilterObjKey)) {
			return InsightFacade.handle_comparison(innerVal, unifiedDatasetName, rootFilterObjKey);
		}

		// LOGICCOMPARISON
		if (InsightFacade.isLogicalComparison(rootFilterObjKey)) {
			assertTrue(typeof innerVal === "object" && Array.isArray(innerVal),
				"Inner object of AND should be an array", InsightError);
			const innerArray = innerVal as unknown[];
			const innerArrayFuncs = innerArray.map(
				(filterElement) => InsightFacade.generateQueryFilterFunction(filterElement, unifiedDatasetName));
			switch (rootFilterObjKey) {
				case "AND":
					return (section: CourseSection) => {
						return innerArrayFuncs.every((f) => f(section));
					};
				case "OR":
					return (section: CourseSection) => {
						return innerArrayFuncs.some((f) => f(section));
					};
				default:
					throw new SyntaxError("Code should be unreachable: Invalid Logical Comparison Key");
			}
		}

		// negation
		if (rootFilterObjKey === "NOT") {
			const f = InsightFacade.generateQueryFilterFunction(innerVal, unifiedDatasetName);
			return (section: CourseSection) => {
				return !f(section);
			};
		}

		throw new InsightError("Invalid Query Command");
	}

	private static inferDataSetName(options: unknown): string {
		assertTrue(typeof options === "object" && options != null &&
			Object.prototype.hasOwnProperty.call(options, "COLUMNS"),
		"OPTIONS should be an object and have the property \"COLUMNS\"", InsightError);
		const columns = (options as {COLUMNS: unknown}).COLUMNS;
		assertTrue(Array.isArray(columns) && columns.length > 0,
			"OPTIONS.COLUMNS should be a nonempty array", InsightError);
		const firstColumn = (columns as unknown[])[0];
		assertTrue(typeof firstColumn === "string",
			"First element of OPTIONS.COLUMNS will be a string only", InsightError);
		const splitFirstColumn = (firstColumn as string).split("_");
		assertTrue(splitFirstColumn.length === 2,
			"First element of OPTIONS.COLUMNS will be in the form of 'key'_'value'", InsightError);
		const dataSetName = splitFirstColumn[0];
		return dataSetName;
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// validation that query is top level valid
		assertTrue(
			typeof query === "object" && query != null &&
			Object.keys(query as object).length === 2 &&
			Object.prototype.hasOwnProperty.call(query, "WHERE") &&
			Object.prototype.hasOwnProperty.call(query, "OPTIONS"),
			"Query should be an object with only have two keys, \"WHERE\" and \"OPTIONS\"", InsightError
		);
		const validQuery = query as {WHERE: unknown, OPTIONS: unknown};

		// load data from disk (hopefully it has already been parsed by addDataset)
		// this is very cringe but required because of bad design (EBNF)
		const datasetName = InsightFacade.inferDataSetName(validQuery.OPTIONS);
		const potentialDataset = this.datasets.get(datasetName);
		if (potentialDataset === undefined) {
			throw new InsightError("Dataset does not exist");
		}
		const allSections: CourseSection[] = potentialDataset.getSections();

		// Handle WHERE Clause
		const queryFilterFunc = InsightFacade.generateQueryFilterFunction(validQuery.WHERE, datasetName);
		const filteredSections = allSections.filter(queryFilterFunc);
		// Handle OPTIONS Clause
		const filteredWithOptions = this.handleOptions(validQuery.OPTIONS, datasetName, filteredSections);

		// force end checks
		if(filteredSections.length > 5000) {
			throw new ResultTooLargeError("Query returned more than 5000 results");
		}

		// convert to InsightResult
		const out: InsightResult[] = filteredWithOptions.map((section) =>
			Object.entries(section).reduce((acc, [key, value]) => ({...acc, [`${datasetName}_${key}`]: value}),
				{}));
		// return final result
		return out;
	}

	public handleOptions(options: unknown,
		datasetName: string, rawCourseSections: CourseSection[]): Array<Partial<CourseSection>> {
		assertTrue(typeof options === "object" && options != null &&
			((Object.keys(options).length === 1 &&
				Object.prototype.hasOwnProperty.call(options, "COLUMNS")) ||
				(Object.keys(options).length === 2 &&
					Object.prototype.hasOwnProperty.call(options, "COLUMNS")) &&
				Object.prototype.hasOwnProperty.call(options, "ORDER")),
		"OPTIONS should be an object with two keys, COLUMNS and ORDER", InsightError);
		const optionsObj = options as {COLUMNS: unknown, ORDER?: unknown};

		if(optionsObj.ORDER !== undefined) {
			assertTrue(typeof optionsObj.ORDER === "string",
				"OPTIONS.ORDER should only be a string", InsightError);
		}
		assertTrue(Array.isArray(optionsObj.COLUMNS) &&
			optionsObj.COLUMNS.every((c) => typeof c === "string"),
		"OPTIONS.COLUMNS should be an array of strings", InsightError);
		const optionsObjInternalValidated = optionsObj as {COLUMNS: string[], ORDER?: string};

		// Select the columns
		const selectColumns = optionsObjInternalValidated.COLUMNS.map((col) => {
			const colParts = col.split("_");
			assertTrue(colParts.length === 2 && colParts[0] === datasetName &&
				CourseSelectionKeyList.includes(colParts[1]), `Invalid Key in COLUMNS, "${col}"`, InsightError);
			return colParts[1] as CourseSelectionKey;
		});


		let out: Array<Partial<CourseSection>> = rawCourseSections.map((s) => {
			const obj: Partial<CourseSection> = {};
			selectColumns.forEach((c) => {
				obj[c] = s[c];
			});
			return obj;
		});

		// Sort the results based on ORDER
		if(optionsObjInternalValidated.ORDER !== undefined) {
			const splitOrderField = optionsObjInternalValidated.ORDER.split("_");
			assertTrue(splitOrderField.length === 2 && splitOrderField[0] === datasetName &&
				CourseSelectionKeyList.includes(splitOrderField[1]), "Invalid Key in ORDER", InsightError);
			const orderField = splitOrderField[1] as CourseSelectionKey;
			assertTrue(selectColumns.includes(orderField), "ORDER key must be in COLUMNS", InsightError);
			out = out.sort((a, b) => {
				if (a[orderField] < b[orderField]) {
					return -1;
				}
				if (a[orderField] > b[orderField]) {
					return 1;
				}
				return 0;
			});
		}

		return out;
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		const insightDatasets: InsightDataset[] = [];
		// Iterate through all datasets in the map
		this.datasets.forEach((dataset, id) => {
			// Create an InsightDataset object for each one
			const insightDataset: InsightDataset = {
				id: dataset.getID(),
				kind: dataset.getKind(),
				numRows: dataset.getSections().length
			};
			insightDatasets.push(insightDataset);
		});
		return Promise.resolve(insightDatasets);
	}
}
