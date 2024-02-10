import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult} from "./IInsightFacade";
import JSZip from "jszip";
import {CourseSection} from "../model/CourseSection";
import {Dataset} from "../model/Dataset";


/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

//	TO DO
//	use fs to read and write to file, you dont need to store anything locally?
//	helper method to validate and check if its json, and anything else before you add
// 	JSZIP will do parsing
// 	fs extra saving and loading to and from disk ALSO removeDataSet
// 	listdataset doesn't need fs extra, you should save sections as an object
// 	create a list of datasets
//	Dual representation both NEED TO BE UP TO DATE REMOVE ADD ETC
//	list of datasets here and one in the disk
//	to check for duplicates, check list
export default class InsightFacade implements IInsightFacade {
	//	priv Dataset here
	private data: Dataset[];
	constructor() {
		console.log("InsightFacadeImpl::init()");
		this.data = [];
		// initalize Dataset
		//	check the actual disk for datasets
		//	disk is the backup, everything will be saved
		//	list is local that erases when program crashes
		//	dont need persistance to test
		//	list of datasets here
		//	use disk in adddataset to save into that disk
		//	same with remove
		//	fs-extra docs
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		//	Initialize DatasetProcessor and pass in arguments from addDataset parameters
		// return Promise.reject("Not implemented.");
		if (id === undefined || id === null || id.trim() === "") {
			return Promise.reject(new InsightError("Invalid ID"));
		}
		return Promise.reject(new InsightError("Not implemented"));
		//	build without persistence, test with c0, then implement persistence

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
