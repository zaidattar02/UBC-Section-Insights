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
		//  initalize Dataset
		//	check the actual disk for datasets
		//	disk is the backup, everything will be saved
		//	list is local that erases when program crashes
		//	use disk in adddataset to save into that disk
		//	same with remove
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
		//	Initialize DatasetProcessor and pass in arguments from addDataset parameters
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

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// // validation that query is valid (everything except WHERE clause)
		// const validQuery = query as {WHERE: object};
		// // load data from disk (hopefully it has already been parsed by addDataset)
		// const allSections: SectionQuery[] = [];
		// // generation of the filter function
		// const datasetName = "courses";
		// const queryFilterFunc = InsightFacade.generateQueryFunction(validQuery.WHERE, datasetName);
		// const filteredSections = allSections.filter(queryFilterFunc); // apply filter function
		// // apply options
		// // return final result
		return Promise.reject("Not implemented.");
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
