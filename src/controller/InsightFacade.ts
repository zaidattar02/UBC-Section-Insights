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
import {assert} from "console";
import {
	SectionQuery, SectionQueryNumericalKeyList,
	SectionQueryNumericalKeys, SectionQueryStringKeyList, SectionQueryStringKeys
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
		console.log("checked id");
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
		console.log(this.datasets.keys());
		if (!this.datasets.has(id)) {
			return Promise.reject(new NotFoundError(`Dataset with id ${id} does not exist`));
		}
		try {
			this.datasets.delete(id);
			console.log("deleted from map");
			const datasetPath = `./data/${id}.json`;
			await fs.remove(datasetPath);
			console.log(id);

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
		(section: SectionQuery) => boolean {
		assert(typeof innerVal === "object", "Inner object of GT should be an object");
		const innerObj = innerVal as object;
		const innerObjKVs = Object.entries(innerObj);
		assert(innerObjKVs.length === 1, "Inner object of GT should only have one key");
		const [dataKeyFull, dataVal] = innerObjKVs[0];

		const splitDataKeyFull = dataKeyFull.split("_");
		assert(
			splitDataKeyFull.length === 2,
			"Key of inner object of GT should be in the form of 'key'_'value'" + dataKeyFull
		);
		const [dataSetName, dataKey] = splitDataKeyFull;
		assert(dataSetName === unifiedDatasetName, "Must only query one dataset");

		// MCOMPARISON
		if(InsightFacade.isMComparison(rootFilterObjKey)) {
			assert(dataKey in SectionQueryNumericalKeyList, "Key of inner object of GT should be a valid key");
			const dataKeyNumerical = dataKey as SectionQueryNumericalKeys;
			assert(typeof dataVal === "number", "Key of inner object of GT should be a string");
			const dataValNum = dataVal as number;

			switch(rootFilterObjKey) {
				case "GT":
					return (section: SectionQuery) => {
						return section[dataKeyNumerical] > dataValNum;
					};
				case "LT":
					return (section: SectionQuery) => {
						return section[dataKeyNumerical] < dataValNum;
					};
				case "EQ":
					return (section: SectionQuery) => {
						return section[dataKeyNumerical] === dataValNum;
					};
				default:
					throw new SyntaxError("Code should be unreachable.");
			}
		} else if(InsightFacade.isSComparison(rootFilterObjKey)) { // SCOMPARISON
			assert(dataKey in SectionQueryStringKeyList, "Key of inner object of GT should be a valid key");
			const dataKeyString = dataKey as SectionQueryStringKeys;
			assert(typeof dataVal === "string", "Key of inner object of GT should be a string");
			const dataValStr = dataVal as string;
			return (section: SectionQuery) => {
				return section[dataKeyString].includes(dataValStr);
			};
		}
		throw new SyntaxError("Code should be unreachable.");
	}

	private static generateQueryFunction(filter: unknown, unifiedDatasetName: string):
		(section: SectionQuery) => boolean {
		assert(typeof filter === "object", "Filter object should be an object");
		const filterobj: object = filter as object;
		assert(Object.keys(filterobj).length === 1, "Filter object should only have one key"); // throw an error later
		const rootFilterObjKey = Object.keys(filterobj)[0];

		const innerVal: unknown = (filterobj as {[key: string]: unknown})[rootFilterObjKey];
		// Comparisons
		if(InsightFacade.isMComparison(rootFilterObjKey) || InsightFacade.isSComparison(rootFilterObjKey)) {
			return InsightFacade.handle_comparison(innerVal, unifiedDatasetName, rootFilterObjKey);
		}

		// LOGICCOMPARISON
		if(InsightFacade.isLogicalComparison(rootFilterObjKey)) {
			assert(typeof innerVal === "object" && Array.isArray(innerVal), "Inner object of AND should be an array");
			const innerArray = innerVal as unknown[];
			const innerArrayFuncs = innerArray.map(
				(filterElement) => InsightFacade.generateQueryFunction(filterElement, unifiedDatasetName));
			switch (rootFilterObjKey) {
				case "AND":
					return (section: SectionQuery) => {
						return innerArrayFuncs.every((f) => f(section));
					};
				case "OR":
					return (section: SectionQuery) => {
						return innerArrayFuncs.some((f) => f(section));
					};
				default:
					throw new SyntaxError("Code should be unreachable.");
			}
		}

		// negation
		if (rootFilterObjKey === "NOT") {
			const f = InsightFacade.generateQueryFunction(innerVal, unifiedDatasetName);
			return (section: SectionQuery) => {
				return !f(section);
			};
		}

		throw new InsightError("Invalid Query Command");
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// validation that query is valid (everything except WHERE clause)
		const validQuery = query as {WHERE: object};
		// load data from disk (hopefully it has already been parsed by addDataset)
		const allSections: SectionQuery[] = [];
		// generation of the filter function
		const datasetName = "courses";
		const queryFilterFunc = InsightFacade.generateQueryFunction(validQuery.WHERE, datasetName);
		const filteredSections = allSections.filter(queryFilterFunc); // apply filter function
		// apply options
		// return final result
		return Promise.reject("Not implemented.");
	}

	public handleOptions(options: unknown, datasetName: string, unprocessedResults: InsightResult[]): InsightResult[] {
		this.assertTrue(typeof options === "object", "OPTIONS should be an object",SyntaxError);

		let optionsObj: {[key: string]: object} = options as {[key: string]: object};

		this.assertTrue(Object.keys(optionsObj).length === 2, "OPTIONS object should only have two keys",SyntaxError);

		this.assertTrue(
			Object.prototype.hasOwnProperty.call(optionsObj, "COLUMNS") &&
				Object.prototype.hasOwnProperty.call(optionsObj, "ORDER"),
			"OPTIONS object should only have two keys",SyntaxError
		);

		this.assertTrue(typeof optionsObj.ORDER === "string", "OPTIONS.ORDER should only be a string",SyntaxError);

		this.assertTrue(
			Array.isArray(optionsObj.COLUMNS) && optionsObj.COLUMNS.every((column: any) => typeof column === "string"),
			"OPTIONS.COLUMNS will be an array of strings only",SyntaxError
		);
		// TODO : Validate Keys format in COLUMNS Object
		// TODO : Validate Key in ORDER Object
		// TODO : Return Data
		return unprocessedResults;
	}

	private assertTrue(condition: boolean, msg: string,ErrorType: new (message?: string) => Error) {
		this.throwErrorOnAssertion(true,condition,msg,ErrorType);
	}

	private assertFalse(condition: boolean, msg: string,ErrorType: new (message?: string) => Error) {
		this.throwErrorOnAssertion(false,condition,msg,ErrorType);
	}

	private throwErrorOnAssertion(assertion: boolean,condition: boolean, msg: string,
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
