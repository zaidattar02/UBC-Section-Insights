import {Dataset} from "../model/Dataset";
import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
import {parse, defaultTreeAdapter} from "parse5";
import{Document} from "parse5/dist/tree-adapters/default";
import {Room} from "../model/Room";
import JSZip = require("jszip");
import {CourseSection} from "../model/CourseSection";
import * as fs from "fs-extra";
import {BuildingInfo} from "../model/BuildingInfo";
import {RoomsDatasetProcessor} from "./RoomsDatasetProcessor";


export abstract class DatasetProcessor {
	public static async ProcessDatasetSection(
		id: string, content: string, kind: InsightDatasetKind
	): Promise<Dataset<CourseSection | Room>> {
		try {
			const zip = new JSZip();
			const data = await zip.loadAsync(content, {base64: true});
			const coursesFolder = data.folder("courses");
			if (!coursesFolder) {
				throw new InsightError("Invalid Data");
			}
			const dataset = new Dataset<CourseSection | Room>(id, kind);
			const filePromises: any[] = [];
			coursesFolder.forEach((_relativePath, file) => filePromises.push(this.ProcessSectionFile(file, dataset)));
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

	public static async ProcessDatasetRoom(id: string, content: string, kind: InsightDatasetKind):
	Promise<Dataset<Room>> {
		try {
			const zip = new JSZip();
			const data = await zip.loadAsync(content, {base64: true});
			const indexFile = data.file("index.htm");
			if (!indexFile) {
				throw new InsightError("Invalid Data: No index file");
			}

			const indexContent = await indexFile.async("string");
			let document: Document;
			try {
				document = parse(indexContent);
			} catch (error) {
				throw new InsightError("Invalid Data: index.htm is not valid HTML");
			}
			// Extract building information from index.htm
			let buildingInfo: BuildingInfo[] = [];
			RoomsDatasetProcessor.handleIndexHtm(defaultTreeAdapter.getChildNodes(document), buildingInfo);
			// console.log(buildingInfo);

			// Create a new dataset instance
			const dataset = new Dataset<Room>(id, kind);
			// Process each building's rooms and add them to the dataset
			const roomPromises = buildingInfo.map(
				(building) => RoomsDatasetProcessor.ProcessBuildingRooms(building, zip, dataset));
			await Promise.all(roomPromises);
			if (dataset.getEntries().length === 0) {
				throw new InsightError("No valid rooms found in the dataset");
			}
			await fs.ensureDir("./data");
			const datasetJsonStr = JSON.stringify(dataset, null, 4);
			const datasetPath = `./data/${id}.json`;
			await fs.writeFile(datasetPath, datasetJsonStr);
			return dataset;
		} catch (error) {
			throw new InsightError(`Error loading dataset: ${error}`);
		}
	}


	public static async ProcessSectionFile(
		file: JSZip.JSZipObject, dataset: Dataset<CourseSection | Room>
	): Promise<void> {
		const fileContent = await file.async("string");
		try {
			const jsonData = JSON.parse(fileContent);
			//	check if there is at least one valid section in file
			if (!this.hasValidSection(jsonData.result)) {
				return; // Skip this file as it doesn't contain any valid section
			}
			jsonData.result.forEach((data: any) => {
				try {
					const section = new CourseSection(
						data.id,data.Course,data.Title,data.Professor,data.Subject,
						data.Avg,data.Pass,data.Fail,
						data.Audit,
						data.Section === "overall" ? 1900 : data.Year
					);
					dataset.addEntry(section);
				} catch (e) {
					console.error(`Invalid section data in file: ${e}`);
				}
			});
		} catch (e) {
			console.error(`Error parsing file content to JSON: ${e}`);
			return;
		}
	}

	private static hasValidSection(sections: any[]): boolean {
		const validKeys = ["id", "Course", "Title", "Professor", "Subject", "Avg", "Pass", "Fail", "Audit", "Year"];
		// Check if at least one section has all valid keys
		return sections.some((section) => validKeys.every((key) => Object.hasOwn(section, key)));
	}
}
