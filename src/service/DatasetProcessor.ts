import JSZip from "jszip";
import {CourseSection} from "../model/CourseSection";
import {Dataset} from "../model/Dataset";
import fs from "fs-extra";
import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";

//	Ask TA
//	modeling the section, how to deal with processing, parsing
//	Section overall case, check project spec DONE
//	How to deal with year not being a number, returns NaN
//	How to deal with validation in constructor
//  Process file or Parse? DONE
//	Dataset has an array of CourseSections
//	Also has a function addSection --> is this how I save the dataset locally? as in after parsing?
//	After implementing this file, do I create an instance of this class in InsightFacade?
//	Need to check for duplicate ids and kind
//	Abstract class and make methods static in TS
//	export abstract class Dataprocessor
//	public static methods

export abstract class DatasetProcessor{
	public static async ProcessDataset(id: string, content: string, kind: InsightDatasetKind): Promise<Dataset> {
		try {
			const zip = new JSZip();
			const data = await zip.loadAsync(content, {base64: true});
			const coursesFolder = data.folder("courses");
			//	reject instead since you are in a promise
			if (!coursesFolder) {
				throw new InsightError("Invalid Data");
			}
			//	how to convert JS object into JSON
			//	convert JS object into JSON object, and save that representation to disk
			const dataset = new Dataset(id, kind);
			const filePromises: Array<Promise<void>> = [];
			//	function that returns error if it's not json
			coursesFolder.forEach((relativePath, file) => {
				if (relativePath.endsWith(".json")) {
					const filePromise = this.processFile(file, dataset);
					filePromises.push(filePromise);
				}
			});
			await Promise.all(filePromises);
			if (dataset.getSections().length === 0) {
				throw new InsightError("No valid sections found in the dataset");
			}
			//  save this dataset as a JSON file to save it back without checks and validations
			//	save one file per dataset
			//	try to take this dataset object, convert the section file into JSON and then save the whole dataset
			return dataset;
		} catch (error) {
			throw new InsightError("Error loading dataset:");
		}
	}

	//	Process a single file at a time
	public static async processFile(file: JSZip.JSZipObject, dataset: Dataset): Promise<void> {
		const fileContent = await file.async("string");
		try {
			const jsonData = JSON.parse(fileContent);
			jsonData.result.forEach((sectionData: any) => {
				if (this.isValidSection(sectionData)) {
					//	have conditional logic to check sectionData.section for overall and do result of condition
					const section = new CourseSection(
						sectionData.uuid,
						sectionData.id,
						sectionData.title,
						sectionData.instructor,
						sectionData.dept,
						sectionData.avg,
						sectionData.pass,
						sectionData.fail,
						sectionData.audit,
						sectionData.year,
					);
					dataset.addSection(section);
				}
			});
		} catch (e) {
			console.error(`Error parsing file content to JSON: ${e}`);
			// Depending on your specs, you might want to throw an error here or skip the file
		}
	}

	//	Process all files in the zip
	// private async Parse(zip: JSZip, dataset: Dataset): Promise<void> {
	// 	const promises = Object.keys(zip.files)
	// 		.filter((relativePath) => relativePath.endsWith(".json"))
	// 		.map(async (relativePath) => {
	// 			const fileContent = await zip.file(relativePath)!.async("string");
	// 			try {
	// 				const courseData = JSON.parse(fileContent);
	// 				courseData.result.forEach((sectionData: any) => {
	// 					if (this.isValidSection(sectionData)) {
	// 						const section = new CourseSection(
	// 							sectionData.uuid,
	// 							sectionData.id,
	// 							sectionData.title,
	// 							sectionData.instructor,
	// 							sectionData.dept,
	// 							sectionData.avg,
	// 							sectionData.pass,
	// 							sectionData.fail,
	// 							sectionData.audit,
	// 							sectionData.year
	// 						);
	// 						dataset.addSection(section);
	// 					}
	// 				});
	// 			} catch (error) {
	// 				console.error(`Error processing file ${relativePath}: ${error}`);
	// 			}
	// 		});
	//
	// 	await Promise.all(promises); //	waits until all JSON files have been processed
	// }

	//	should this function take in an instance of CourseSection?
	//	the section overall case, how do I look for that in CourseSection?
	//	should the validation be in the constructor class of CourseSection instead?
	//	dont need it here after constructor
	public static isValidSection(section: CourseSection): boolean{
		return true;
	}

	// public loadDataset(content: string): Promise<JSZip> {
	// 	const zip = new JSZip();
	// 	return zip.loadAsync(content, {base64: true})
	// 		.then((data) => {
	// 			if (!data.folder("courses")) {
	// 				throw new InsightError("Invalid Data");
	// 			}
	//
	// 			return data;
	// 		})
	// 		.catch((error) => {
	// 			throw new InsightError(`Error loading dataset: ${error.message}`);
	// 		});
	// }
	// public loadDataset(id: string, content: string, kind: InsightDatasetKind): Promise<Dataset> {
	// 	const zip = new JSZip();
	// 	return zip.loadAsync(content, {base64: true})
	// 		.then(async (data) => {
	// 			if (!data.folder("courses")) {
	// 				throw new InsightError("Invalid Data: Missing courses directory");
	// 			}
	//
	// 			const dataset = new Dataset(id, kind);
	// 			const filePromises = [];
	//
	// 			coursesFolder.forEach((relativePath, file) => {
	// 				if (relativePath.endsWith(".json")) {
	// 					const filePromise = file.async("string").then((fileContent) => {
	// 						try {
	// 							const jsonData = JSON.parse(fileContent);
	// 							jsonData.result.forEach((sectionData) => {
	// 								if (this.isValidSection(sectionData)) {
	// 									const section = new CourseSection(
	// 										sectionData.uuid, id, sectionData.title, sectionData.instructor,
	// 										sectionData.dept, sectionData.avg, sectionData.pass,
	// 										sectionData.fail, sectionData.audit,
	// 										sectionData.year
	// 									);
	// 									dataset.addSection(section);
	// 								}
	// 							});
	// 						} catch (e) {
	// 							console.error(`Error parsing file ${relativePath}: ${e}`);
	// 						}
	// 					});
	// 					filePromises.push(filePromise);
	// 				}
	// 			});
	//
	// 			await Promise.all(filePromises);
	// 			if (dataset.getSections().length === 0) {
	// 				throw new InsightError("No valid sections found in the dataset");
	// 			}
	// 			return dataset;
	// 		})
	// 		.catch((error) => {
	// 			throw new InsightError(`Error loading dataset: ${error.message}`);
	// 		});
	// }

	// public loadDataset(id: string, content: string, kind: InsightDatasetKind): Promise<Dataset> {
	// 	const zip = new JSZip();
	// 	return zip.loadAsync(content, {base64: true})
	// 		.then(async (data) => {
	// 			const coursesFolder = data.folder("courses");
	// 			if (!coursesFolder) {
	// 				throw new InsightError("Invalid Data");
	// 			}
	//
	// 			const dataset = new Dataset(id, kind);
	// 			const filePromises = [];
	//
	// 			coursesFolder.forEach((relativePath, file) => {
	// 				if (relativePath.endsWith(".json")) {
	// 					const filePromise = file.async("string").then((fileContent) => {
	// 						try {
	// 							const jsonData = JSON.parse(fileContent);
	// 							jsonData.result.forEach((sectionData) => {
	// 								if (this.isValidSection(sectionData)) {
	// 									const section = new CourseSection(
	// 										sectionData.uuid, id, sectionData.title, sectionData.instructor,
	// 										sectionData.dept, sectionData.avg, sectionData.pass,
	// 										sectionData.fail, sectionData.audit,
	// 										sectionData.year
	// 									);
	// 									dataset.addSection(section);
	// 								}
	// 							});
	// 						} catch (e) {
	// 							console.error(`Error parsing file ${relativePath}: ${e}`);
	// 						}
	// 					});
	// 					filePromises.push(filePromise);
	// 				}
	// 			});
	//
	// 			await Promise.all(filePromises);
	// 			if (dataset.getSections().length === 0) {
	// 				throw new InsightError("No valid sections found in the dataset");
	// 			}
	// 			return dataset;
	// 		})
	// 		.catch((error) => {
	// 			throw new InsightError(`Error loading dataset: ${error.message}`);
	// 		});
	// }

//
}
