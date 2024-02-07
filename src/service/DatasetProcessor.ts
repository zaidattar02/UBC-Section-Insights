import JSZip from "jszip";
import {CourseSection} from "../model/CourseSection";
import {Dataset} from "../model/Dataset";
import fs from "fs-extra";
import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";

export class DatasetProcessor{
	public async ProcessDataset(id: string, content: string, kind: InsightDatasetKind): Promise<Dataset> {
		try {
			const zip = new JSZip();
			const data = await zip.loadAsync(content, {base64: true});
			const coursesFolder = data.folder("courses");
			if (!coursesFolder) {
				throw new InsightError("Invalid Data");
			}

			const dataset = new Dataset(id, kind);
			const filePromises: Array<Promise<void>> = [];

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

			return dataset;
		} catch (error) {
			throw new InsightError("Error loading dataset:");
		}
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


	private async processFile(file: JSZip.JSZipObject, dataset: Dataset): Promise<void> {
		const fileContent = await file.async("string");
		const jsonData = JSON.parse(fileContent);
		jsonData.result.forEach((sectionData: any) => {
			if (this.isValidSection(sectionData)) {
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
					sectionData.year
				);
				dataset.addSection(section);
			}
		});
	}

	private isValidSection(section: any): boolean{
		return true;
	}

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
// 	// private async Parse(zip: JSZip, dataset: Dataset): Promise<void> {
// 	// 	const promises = Object.keys(zip.files)
// 	// 		.filter((relativePath) => relativePath.endsWith(".json"))
// 	// 		.map(async (relativePath) => {
// 	// 			const fileContent = await zip.file(relativePath)!.async("string");
// 	// 			try {
// 	// 				const courseData = JSON.parse(fileContent);
// 	// 				courseData.result.forEach((sectionData: any) => {
// 	// 					if (this.isValidSection(sectionData)) {
// 	// 						const section = new CourseSection(
// 	// 							sectionData.uuid,
// 	// 							sectionData.id.toString(), // Ensure 'id' is treated as a string
// 	// 							sectionData.title,
// 	// 							sectionData.instructor,
// 	// 							sectionData.dept,
// 	// 							sectionData.avg,
// 	// 							sectionData.pass,
// 	// 							sectionData.fail,
// 	// 							sectionData.audit,
// 	// 							sectionData.year, // Handle year appropriately
// 	// 						);
// 	// 						dataset.addSection(section);
// 	// 					}
// 	// 				});
// 	// 			} catch (error) {
// 	// 				console.error(`Error processing file ${relativePath}: ${error}`);
// 	// 			}
// 	// 		});
// 	//
// 	// 	await Promise.all(promises);
// 	// }
//

}
