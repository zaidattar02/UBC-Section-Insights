import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult} from "./IInsightFacade";
import {Dataset} from "../model/Dataset";
import {DatasetProcessor} from "../service/DatasetProcessor";
import fs from "fs-extra";


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
	constructor() {
		console.log("InsightFacadeImpl::init()");
		this.datasets = new Map();
		this.loadDatasetsFromDisk().catch((error) => {
			console.error("Failed to load datasets from disk:", error);
		});
		console.log("loaded from disk");
		//  initalize Dataset
		//	check the actual disk for datasets
		//	disk is the backup, everything will be saved
		//	list is local that erases when program crashes
		//	use disk in adddataset to save into that disk
		//	same with remove
	}

	private async loadDatasetsFromDisk(): Promise<void> {
		//	Do I need to add another check to see if its a json file here?
		try {
			await fs.ensureDir("./data");
			const files = await fs.readdir("./data"); // Get a list of dataset files
			const loadPromises = files.map(async (file) => {
				const filePath = `./data/${file}`;
				const datasetJsonStr = await fs.readFile(filePath, "utf8");
				const dataset = JSON.parse(datasetJsonStr);
				this.datasets.set(dataset.id, dataset);
			});
			await Promise.all(loadPromises);
		} catch (error) {
			console.error("Failed to load datasets from disk:", error);
			// Handle more errors?
		}
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		//	Initialize DatasetProcessor and pass in arguments from addDataset parameters
		if (id === undefined || id === null || id.trim() === "") {
			return Promise.reject(new InsightError("Invalid ID"));
			//	change to throw new InsightError?
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
		return Promise.reject("Not implemented.");
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		return Promise.reject("Not implemented.");
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		return Promise.reject("Not implemented.");
	}
}
