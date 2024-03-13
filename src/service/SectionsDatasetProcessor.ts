import JSZip from "jszip";
import {CourseSection} from "../model/CourseSection";
import {Dataset} from "../model/Dataset";
import fs from "fs-extra";
import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
import {Room} from "../model/Room";
import {IDatasetProcessor} from "./IDatasetProcessor";

//	TA feedback:
//	Dataset has an array of CourseSections
//	Also has a function addSection --> is this how I save the dataset locally? as in after parsing?
//	After implementing this file, do I create an instance of this class in InsightFacade?
//	Need to check for duplicate ids and kind
//	Abstract class and make methods static in TS
//	export abstract class Dataprocessor
//	public static methods

export class SectionsDatasetProcessor implements IDatasetProcessor {
	public async processDataset(
		id: string,
		content: string,
		kind: InsightDatasetKind
	): Promise<Dataset<CourseSection>> {
		try {
			const zip = new JSZip();
			const data = await zip.loadAsync(content, {base64: true});
			const coursesFolder = data.folder("courses");
			if (!coursesFolder) {
				throw new InsightError("Invalid Data");
			}
			// if
			const dataset = new Dataset<CourseSection>(id, kind);
			const filePromises: any[] = [];
			coursesFolder.forEach((relativePath, file) => {
				const filePromise = this.processFile(file, dataset);
				filePromises.push(filePromise);
			});
			await Promise.all(filePromises);
			if (dataset.getEntries().length === 0) {
				throw new InsightError("No valid sections found in the dataset");
			}
			//	convert JS object into JSON object, and save that representation to disk
			//  save this dataset as a JSON file to save it back without checks and validations
			//	save one file per dataset
			await fs.ensureDir("./data");
			const datasetJsonStr = JSON.stringify(dataset, null, 4);
			const datasetPath = `./data/${id}.json`;
			await fs.writeFile(datasetPath, datasetJsonStr);
			return dataset;
		} catch (error) {
			throw new InsightError(`Error loading dataset: ${error}`);
		}
	}

	public async processFile(file: JSZip.JSZipObject, dataset: Dataset<CourseSection | Room>): Promise<void> {
		const fileContent = await file.async("string");
		try {
			const jsonData = JSON.parse(fileContent);
			//	check if there is at least one valid section in file
			if (!this.hasValidSection(jsonData.result)) {
				return; // Skip this file as it doesn't contain any valid section
			}
			jsonData.result.forEach((sectionData: any) => {
				try {
					const section = new CourseSection(
						sectionData.id,
						sectionData.Course,
						sectionData.Title,
						sectionData.Professor,
						sectionData.Subject,
						sectionData.Avg,
						sectionData.Pass,
						sectionData.Fail,
						sectionData.Audit,
						sectionData.Section === "overall" ? 1900 : sectionData.Year
					);
					dataset.addEntry(section);
				} catch (e) {
					console.error(`Invalid section data in file: ${e}`);
				}
			});
		} catch (e) {
			console.error(`Error parsing file content to JSON: ${e}`);
			return;
			// return Promise.reject(new InsightError("Not a JSON file"));
		}
	}

	private hasValidSection(sections: any[]): boolean {
		const validKeys = ["id", "Course", "Title", "Professor", "Subject", "Avg", "Pass", "Fail", "Audit", "Year"];
		// Check if at least one section has all valid keys
		return sections.some((section) => validKeys.every((key) => Object.hasOwn(section, key)));
	}
}
