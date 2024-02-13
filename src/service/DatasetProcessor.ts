import JSZip from "jszip";
import {CourseSection} from "../model/CourseSection";
import {Dataset} from "../model/Dataset";
import fs from "fs-extra";
import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";


//	TA feedback:
//	Dataset has an array of CourseSections
//	Also has a function addSection --> is this how I save the dataset locally? as in after parsing?
//	After implementing this file, do I create an instance of this class in InsightFacade?
//	Need to check for duplicate ids and kind
//	Abstract class and make methods static in TS
//	export abstract class Dataprocessor
//	public static methods


export abstract class DatasetProcessor{
	// public static async ProcessDataset(id: string, content: string, kind: InsightDatasetKind): Promise<Dataset> {
	// 	console.log("attempting to load");
	// 	try {
	// 		const zip = await JSZip.loadAsync(content, {base64: true});
	// 		const coursesFolder = zip.folder("courses");
	// 		if (!coursesFolder || Object.keys(coursesFolder.files).length === 0) {
	// 			throw new InsightError("Invalid Data: No courses directory or it is empty");
	// 		}
	//
	// 		const dataset = new Dataset(id, kind);
	// 		const filePromises = [];
	// 		for (let relativePath in coursesFolder.files) {
	// 			let file = coursesFolder.files[relativePath];
	// 			filePromises.push(this.processFile(file, dataset));
	// 		}
	// 		await Promise.all(filePromises);
	// 		console.log("awaited promises");
	// 		if (dataset.getSections().length === 0) {
	// 			throw new InsightError("No valid sections found in the dataset");
	// 		}
	// 		//  save this dataset as a JSON file to save it back without checks and validations
	// 		//	save one file per dataset
	// 		//	try to take this dataset object, convert the section file into JSON and then save the whole dataset
	// 		await fs.ensureDir("./data");
	// 		const datasetJsonStr = JSON.stringify(dataset,null,4);
	// 		const datasetPath = `./data/${id}.json`;
	// 		await fs.writeFile(datasetPath,datasetJsonStr);
	// 		return dataset;
	// 	} catch (error) {
	// 		throw new InsightError(`Error loading dataset: ${error}`);
	// 	}
	// }

	public static async ProcessDataset(id: string, content: string, kind: InsightDatasetKind): Promise<Dataset> {
		console.log("attempting to load");
		try {
			const zip = new JSZip();
			const data = await zip.loadAsync(content, {base64: true});
			const coursesFolder = data.folder("courses");
			if (!coursesFolder) {
				throw new InsightError("Invalid Data");
			}
			const dataset = new Dataset(id, kind);
			const filePromises: any[] = [];
			coursesFolder.forEach((relativePath, file) => {
				const filePromise = this.processFile(file, dataset);
				filePromises.push(filePromise);
			});
			await Promise.all(filePromises);
			if (dataset.getSections().length === 0) {
				throw new InsightError("No valid sections found in the dataset");
			}
			//	convert JS object into JSON object, and save that representation to disk
			//  save this dataset as a JSON file to save it back without checks and validations
			//	save one file per dataset
			//	try to take this dataset object, convert the section file into JSON and then save the whole dataset
			await fs.ensureDir("./data");
			const datasetJsonStr = JSON.stringify(dataset,null,4);
			const datasetPath = `./data/${id}.json`;
			await fs.writeFile(datasetPath,datasetJsonStr);
			return dataset;
		} catch (error) {
			throw new InsightError(`Error loading dataset: ${error}`);
		}
	}

	public static async processFile(file: JSZip.JSZipObject, dataset: Dataset): Promise<void> {
		const fileContent = await file.async("string");
		try {
			const jsonData = JSON.parse(fileContent);
			//	check if there is at least one valid section in file
			// if (!this.hasValidSection(jsonData.result)) {
			// 	console.error("No valid section found in file.");
			// 	return; // Skip this file as it doesn't contain any valid section
			// }
			jsonData.result.forEach((sectionData: any) => {
				if (sectionData.section === "overall") {
					sectionData.year = 1900;
				}
				try{
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
				} catch(e){
					console.error(`Invalid section data in file: ${e}`);
				}
			});
		} catch (e) {
			console.error(`Error parsing file content to JSON: ${e}`);
			//	Is return enough to skip the logic for current non JSON file i.e skipping the CourseSection that is invalid
			return;
		}
	}


	private static hasValidSection(sections: any[]): boolean {
		const validKeys = ["uuid", "id", "title", "instructor", "dept", "avg", "pass", "fail", "audit", "year"];

		// Check if at least one section has all valid keys
		return sections.some((section) =>
			validKeys.every((key) => Object.hasOwn(section,key))
		);
	}

	// public static async ProcessDataset(id: string, content: string, kind: InsightDatasetKind): Promise<Dataset> {
	// 	console.log("Attempting to load dataset");
	// 	try {
	// 		const zip = await JSZip.loadAsync(content, {base64: true});
	// 		const coursesFolder = zip.folder("courses");
	// 		if (!coursesFolder || Object.keys(coursesFolder.files).length === 0) {
	// 			throw new InsightError("Invalid Data: No courses directory or it is empty");
	// 		}
	//
	// 		const dataset = new Dataset(id, kind);
	// 		const filePromises: Array<Promise<void>> = [];
	//
	// 		Object.keys(coursesFolder.files).forEach((relativePath) => {
	// 			console.log(relativePath);
	// 			if (!relativePath.endsWith(".json")) {
	// 				console.log("not json");
	// 				return;
	// 			} // Skip non-JSON files
	//
	// 			console.log("Processing JSON file:", relativePath);
	// 			const file = coursesFolder.files[relativePath];
	// 			const filePromise = file.async("string").then((fileContent) => {
	// 				return DatasetProcessor.processFile(fileContent, dataset); // Ensure you are calling it correctly
	// 			});
	// 			filePromises.push(filePromise);
	// 		});
	//
	// 		await Promise.all(filePromises);
	//
	// 		if (dataset.getSections().length === 0) {
	// 			throw new InsightError("No valid sections found in the dataset");
	// 		}
	//
	// 		console.log("Saving dataset to disk");
	// 		await fs.ensureDir("./data");
	// 		const datasetJsonStr = JSON.stringify(dataset, null, 4);
	// 		await fs.writeFile(`./data/${id}.json`, datasetJsonStr);
	//
	// 		return dataset;
	// 	} catch (error) {
	// 		throw new InsightError(`Error processing dataset: ${error}`);
	// 	}
	// }
	//
	// public static async processFile(fileContent: string, dataset: Dataset): Promise<void> {
	// 	try {
	// 		// Parse the JSON content of the file
	// 		const jsonData = JSON.parse(fileContent);
	//
	// 		// Iterate over each section in the result array
	// 		jsonData.result.forEach((sectionData: any) => {
	// 			// Handle the case where section is "overall" and year needs to be set to 1900
	// 			if (sectionData.Section === "overall") {
	// 				sectionData.Year = 1900;
	// 			}
	//
	// 			// Create a new CourseSection instance
	// 			try {
	// 				const section = new CourseSection(
	// 					sectionData.uuid,
	// 					dataset.getID(), // Assuming id is the dataset ID and not sectionData.id
	// 					sectionData.Title,
	// 					sectionData.Instructor,
	// 					sectionData.Subject, // Assuming dept maps to Subject
	// 					sectionData.Avg,
	// 					sectionData.Pass,
	// 					sectionData.Fail,
	// 					sectionData.Audit,
	// 					parseInt(sectionData.Year, 10), // Ensuring Year is treated as a number
	// 				);
	// 				// Add the section to the dataset
	// 				dataset.addSection(section);
	// 			} catch (error) {
	// 				console.error(`Error creating CourseSection from data: ${error}`);
	// 			}
	// 		});
	// 	} catch (error) {
	// 		console.error(`Error parsing file content to JSON: ${error}`);
	// 	}
	// }


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
}
