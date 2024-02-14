import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
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

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

//	TO DO
//	use fs to read and write to file, you dont need to store anything locally?
//	helper method to validate and check if its json, and anything else before you add
// 	fs extra saving and loading to and from disk ALSO removeDataSet
// 	listdataset doesn't need fs extra, you should save sections as an object
// 	create a list of datasets
//	Dual representation both NEED TO BE UP TO DATE IN REMOVEDATASET AND ADDDATASET
//	list of datasets here(private variable data) and one in the disk
//	to check for duplicates, check list of datasets
export default class InsightFacade implements IInsightFacade {
	private datasets: Map<string,Dataset>;
	private datasetsLoaded;
	constructor() {
		console.log("InsightFacadeImpl::init()");
		this.datasets = new Map();
		this.datasetsLoaded = this.loadDatasetsFromDisk().catch((error) => {
			console.error("Failed to load datasets from disk:", error);
		});
	}

	//	test method and make sure it loads after new instance.
	//	try this as a loop
	// private async loadDatasetsFromDisk(): Promise<void> {
	// 	try {
	// 		await fs.ensureDir("./data");
	// 		const files = await fs.readdir("./data"); // Get a list of dataset files
	// 		const loadPromises = files.map(async (file) => {
	// 			const filePath = `./data/${file}`;
	// 			const datasetJsonStr = await fs.readFile(filePath, "utf8");
	// 			const dataset = JSON.parse(datasetJsonStr);
	// 			this.datasets.set(dataset.id, dataset);
	// 			// console.log(dataset);
	// 			// console.log(`Loading dataset with id: ${dataset.id}`);
	// 		});
	// 		await Promise.all(loadPromises);
	// 	} catch (error) {
	// 		console.error("Failed to load datasets from disk:", error);
	// 		//	skip it if isn't a valid file
	// 		return;
	// 	}
	// }
	//	debug addDataset and loadDataset w bp at points w correct datset values

	private async loadDatasetsFromDisk(): Promise<void> {
		await fs.ensureDir("./data");
		const files = await fs.readdir("./data"); // Get a list of dataset files
		const loadPromises = files.map(async (file) => {
			try {
				const filePath = `./data/${file}`;
				const datasetJsonStr = await fs.readFile(filePath, "utf8");
				// const dataset = JSON.parse(datasetJsonStr);
				// this.datasets.set(dataset.id, dataset);
				const dataset = Dataset.fromObject(JSON.parse(datasetJsonStr));
				this.datasets.set(dataset.getID(), dataset);
			} catch (error) {
				console.error(`Failed to load dataset from file ${file}:`, error);
				// Skip this file and continue with the rest
			}
		});
		await Promise.all(loadPromises);
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (!id || id.trim().length === 0 || id.includes("_")) {
			throw new InsightError("Invalid ID");
		}
		if(kind !== InsightDatasetKind.Sections){
			return Promise.reject(new InsightError("Invalid Dataset Kind"));
		}
		if(this.datasets.has(id)){
			throw new InsightError("Dataset already exists");
		}
		try{
			const dataset = await DatasetProcessor.ProcessDataset(id,content,kind);
			this.datasets.set(id,dataset);

			return Array.from(this.datasets.keys());
		} catch(error){
			throw new InsightError(`Failed to add dataset: ${error}`);
		}
	}

	public async removeDataset(id: string): Promise<string> {
		await this.datasetsLoaded;
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
		return key === "AND" || key === "OR" || key === "NOT";
	}

	private static isMComparison(key: string): boolean {
		return key === "GT" || key === "LT" || key === "EQ";
	}

	private static isSComparison(key: string): boolean {
		return key === "IS";
	}

	private static handle_comparison(innerVal: unknown, unifiedDatasetName: string, rootFilterObjKey: string):
		(section: CourseSection) => boolean {
		InsightFacade.assertTrue(typeof innerVal === "object", "Inner object of GT should be an object", InsightError);
		const innerObj = innerVal as object;
		const innerObjKVs = Object.entries(innerObj);
		InsightFacade.assertTrue(innerObjKVs.length === 1, "Inner object of GT should only have one key", InsightError);
		const [dataKeyFull, dataVal] = innerObjKVs[0];

		const splitDataKeyFull = dataKeyFull.split("_");
		InsightFacade.assertTrue(
			splitDataKeyFull.length === 2,
			"Key of inner object of GT should be in the form of 'key'_'value'" + dataKeyFull, InsightError
		);
		const [dataSetName, dataKey] = splitDataKeyFull;
		InsightFacade.assertTrue(dataSetName === unifiedDatasetName, "Must only query one dataset", InsightError);

		// MCOMPARISON
		if(InsightFacade.isMComparison(rootFilterObjKey)) {
			InsightFacade.assertTrue(dataKey in CourseSectionNumericalKeyList,
				"Key of inner object of GT should be a valid key", InsightError);
			const dataKeyNumerical = dataKey as CourseSectionNumericalKeys;
			InsightFacade.assertTrue(typeof dataVal === "number", "Key of inner object of GT should be a string",
				InsightError);
			const dataValNum = dataVal as number;

			switch(rootFilterObjKey) {
				case "GT":
					return (section: CourseSection) => {
						return section[dataKeyNumerical] > dataValNum;
					};
				case "LT":
					return (section: CourseSection) => {
						return section[dataKeyNumerical] < dataValNum;
					};
				case "EQ":
					return (section: CourseSection) => {
						return section[dataKeyNumerical] === dataValNum;
					};
				default:
					throw new SyntaxError("Code should be unreachable.");
			}
		} else if(InsightFacade.isSComparison(rootFilterObjKey)) { // SCOMPARISON
			InsightFacade.assertTrue(dataKey in CourseSectionStringKeyList,
				"Key of inner object of GT should be a valid key", InsightError);
			const dataKeyString = dataKey as CourseSectionStringKeys;
			InsightFacade.assertTrue(typeof dataVal === "string",
				"Key of inner object of GT should be a string", InsightError);
			const dataValStr = dataVal as string;
			return (section: CourseSection) => {
				return section[dataKeyString].includes(dataValStr);
			};
		}
		throw new SyntaxError("Code should be unreachable.");
	}

	private static generateQueryFilterFunction(filter: unknown, unifiedDatasetName: string):
		(section: CourseSection) => boolean {
		InsightFacade.assertTrue(typeof filter === "object", "Filter object should be an object", InsightError);
		const filterobj: object = filter as object;
		InsightFacade.assertTrue(Object.keys(filterobj).length === 1,
			"Filter object should only have one key", InsightError); // throw an error later
		const rootFilterObjKey = Object.keys(filterobj)[0];

		const innerVal: unknown = (filterobj as {[key: string]: unknown})[rootFilterObjKey];
		// Comparisons
		if(InsightFacade.isMComparison(rootFilterObjKey) || InsightFacade.isSComparison(rootFilterObjKey)) {
			return InsightFacade.handle_comparison(innerVal, unifiedDatasetName, rootFilterObjKey);
		}

		// LOGICCOMPARISON
		if(InsightFacade.isLogicalComparison(rootFilterObjKey)) {
			InsightFacade.assertTrue(typeof innerVal === "object" && Array.isArray(innerVal),
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
					throw new SyntaxError("Code should be unreachable.");
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
		InsightFacade.assertTrue(typeof options === "object" && options != null &&
		Object.prototype.hasOwnProperty.call(options, "COLUMNS"),
		"OPTIONS should be an object and have the property \"COLUMNS\"", InsightError);
		const columns = (options as {COLUMNS: unknown}).COLUMNS;
		InsightFacade.assertTrue(Array.isArray(columns) && columns.length > 0,
			"OPTIONS.COLUMNS should be a nonempty array", InsightError);
		const firstColumn = (columns as unknown[])[0];
		InsightFacade.assertTrue(typeof firstColumn === "string",
			"First element of OPTIONS.COLUMNS will be a string only", InsightError);
		const splitFirstColumn = (firstColumn as string).split("_");
		InsightFacade.assertTrue(splitFirstColumn.length === 2,
			"First element of OPTIONS.COLUMNS will be in the form of 'key'_'value'", InsightError);
		const dataSetName = splitFirstColumn[0];
		return dataSetName;
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// validation that query is top level valid
		InsightFacade.assertTrue(
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
		if(potentialDataset === undefined) {
			throw new InsightError("Dataset does not exist");
		}
		const allSections: CourseSection[] = potentialDataset.getSections();

		// Handle WHERE Clause
		const queryFilterFunc = InsightFacade.generateQueryFilterFunction(validQuery.WHERE, datasetName);
		const filteredSections = allSections.filter(queryFilterFunc);

		// Handle OPTIONS Clause
		const filteredWithOptions = this.handleOptions(validQuery.OPTIONS, datasetName, filteredSections);

		// return final result
		return filteredWithOptions;
	}

	public handleOptions(options: unknown, datasetName: string, rawCourseSections: CourseSection[]): InsightResult[] {
		InsightFacade.assertTrue(typeof options === "object" && options != null &&
			Object.keys(options).length === 2 &&
			Object.prototype.hasOwnProperty.call(options, "COLUMNS") &&
			Object.prototype.hasOwnProperty.call(options, "ORDER"),
		"OPTIONS should be an object with two keys, COLUMNS and ORDER", InsightError);
		const optionsObj = options as {COLUMNS: unknown, ORDER: unknown};

		InsightFacade.assertTrue(typeof optionsObj.ORDER === "string",
			"OPTIONS.ORDER should only be a string", InsightError);
		InsightFacade.assertTrue( Array.isArray(optionsObj.COLUMNS) &&
			optionsObj.COLUMNS.every((c) => typeof c === "string"),
		"OPTIONS.COLUMNS should be an array of strings", InsightError );
		const optionsObjInternalValidated = optionsObj as {COLUMNS: string[], ORDER: string};

		// Select the columns
		const selectColumns = optionsObjInternalValidated.COLUMNS.map((c)=>{
			const p = c.split("_");
			InsightFacade.assertTrue(p.length === 2 && p[0] === datasetName &&
				p[1] in CourseSelectionKeyList, "Invalid Key in COLUMNS", InsightError);
			return p[1] as CourseSelectionKey;
		});
		const correctColumns: Array<Partial<CourseSection>> = rawCourseSections.map((s) => {
			const obj: Partial<CourseSection> = {};
			selectColumns.forEach((c) => {
				obj[c] = s[c];
			});
			return obj;
		});

		// Sort the results based on ORDER
		const splitOrderField = optionsObjInternalValidated.ORDER.split("_");
		InsightFacade.assertTrue(splitOrderField.length === 2 && splitOrderField[0] === datasetName &&
			splitOrderField[1] in CourseSelectionKeyList, "Invalid Key in ORDER", InsightError);
		const orderField = splitOrderField[1] as CourseSelectionKey;
		const correctColumnsAndOrder = correctColumns.sort((a, b) => {
			if (a[orderField] < b[orderField]) {
				return -1;
			}
			if (a[orderField] > b[orderField]) {
				return 1;
			}
			return 0;
		});

		return correctColumnsAndOrder.map((c)=>{
			const obj: InsightResult = {};
			return obj;
		});
	}

	private static assertTrue(condition: boolean, msg: string,ErrorType: new (message?: string) => Error) {
		this.throwErrorOnAssertion(true,condition,msg,ErrorType);
	}

	private static assertFalse(condition: boolean, msg: string,ErrorType: new (message?: string) => Error) {
		this.throwErrorOnAssertion(false,condition,msg,ErrorType);
	}

	private static throwErrorOnAssertion(assertion: boolean,condition: boolean, msg: string,
		ErrorType: new (message?: string) => Error) {
		if (assertion !== condition) {
			const error = new ErrorType(msg);
			error.message = msg;
			throw error;
		}
	}


	public async listDatasets(): Promise<InsightDataset[]> {
		await this.datasetsLoaded;
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
