import JSZip from "jszip";
import {CourseSection} from "../model/CourseSection";
import {Dataset} from "../model/Dataset";
import fs from "fs-extra";
import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
import * as parse5 from "parse5";
import {Building} from "../model/Building";
import {Room} from "../model/Room";
import {fetchData} from "./HttpService";
import {IDatasetProcessor} from "./IDatasetProcessor";

//	TA feedback:
//	Dataset has an array of CourseSections
//	Also has a function addSection --> is this how I save the dataset locally? as in after parsing?
//	After implementing this file, do I create an instance of this class in InsightFacade?
//	Need to check for duplicate ids and kind
//	Abstract class and make methods static in TS
//	export abstract class Dataprocessor
//	public static methods

export class RoomsDatasetProcessor implements IDatasetProcessor {
	public async processDataset(id: string, content: string, kind: InsightDatasetKind): Promise<Dataset> {
		try {
			const zip = new JSZip();
			const data = await zip.loadAsync(content, {base64: true});
			const indexFile = data.file("index.htm");

			//Index.htm should exists
			if (!indexFile) {
				throw new InsightError("Invalid Data Index.htm not found");
			}
			//valid rooms folder structure should exists
			const buildingFilesFolder = await data.folder("campus/discover/buildings-and-classrooms/");
			if (!buildingFilesFolder) {
				throw new InsightError("Invalid Data");
			}
			//Atleast should have a file with room info
			if (buildingFilesFolder.length == 0) {
				throw new InsightError("Invalid Data Should Contain Atleast 1 Room");
			}

			const htmlFileContent = await indexFile.async("string");

			// Parse the HTML content using Parse5
			const document = parse5.parse(htmlFileContent);
			const buildingList: Building[] = this.getBuildingList(document);
			const allRooms:Room[] = [];

			await Promise.all(
				buildingList.map(async (building: Building) => {
					const roomList: Room[] = await this.getRoomList(data, building);
					allRooms.concat(roomList);
				})
			);

			const dataset = Dataset.fromObject({
				id : id,
				kind : kind,
				entries : allRooms
			})

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
	private getBuildingList(document: object): Building[] {
		const buildingInfo: Building[] = [];
		const buildingTable: {[key: string]: any} = this.getTable(document, "views-field-field-building-address");
		const tableRows = this.getHTMLElements(buildingTable, "tr");
		tableRows.forEach((tr) => {
			const title = this.getCellValueFromTableRow(tr, "views-field-title", "#text");
			const code = this.getCellValueFromTableRow(tr, "views-field-field-building-code", "#text");
			const address = this.getCellValueFromTableRow(tr, "views-field-field-building-address", "#text");
			const link = this.getCellValueFromTableRow(tr, "views-field-nothing", "a");
			buildingInfo.push(new Building(code, title, address, link));
		});
		return buildingInfo;
	}
	private async getRoomList(data: JSZip, building: Building): Promise<Room[]> {
		const buildingFile = data.file(building.link);
		const roomList: Room[] = [];
		if (buildingFile) {
			const buildingFileContent = await buildingFile.async("string");
			const document = parse5.parse(buildingFileContent);
			const roomList: Room[] = [];
			const roomTable: {[key: string]: any} = this.getTable(document, "views-field-field-room-number");
			const tableRows = this.getHTMLElements(roomTable, "tr");

			await Promise.all(
				tableRows.map(async (tr) => {
					const room: Room = await this.tableRowToRoom(tr, document, building);
					roomList.push(room);
				})
			);
		}
		return roomList;
	}
	public getHTMLElements(document: object, tag: string): {[key: string]: any}[] {
		const elements: [{[key: string]: any}][] = [];
		const traverse = (node: any) => {
			if (node.nodeName === tag) {
				elements.push(node);
			}
			if (node.childNodes) {
				for (const childNode of node.childNodes) {
					traverse(childNode);
				}
			}
		};
		traverse(document);
		return elements;
	}
	private getTable(document: object, identifier: string): {[key: string]: any} {
		const tables: {[key: string]: any}[] = this.getHTMLElements(document, "table");

		let filteredTables = tables.filter((table: {[key: string]: any}) => {
			const tds: {[key: string]: any}[] = this.getHTMLElements(table, "td");
			return tds.some((td: {[key: string]: any}) => {
				const identifierRegex = new RegExp(identifier, "i");
				return (
					td.attrs.filter(
						(attr: {[key: string]: any}) => attr.name == "class" && attr.value.search(identifierRegex) != -1
					).length != 0
				);
			});
		});

		return filteredTables && filteredTables.length != 0 ? filteredTables[0] : [];
	}
	private getCellValueFromTableRow(tr: {[key: string]: any}, cellIdentifier: string, valueType: string): string {
		let value = "";
		let tds = this.getHTMLElements(tr, "td");
		tds.forEach((td: any, index: number) => {
			if (td.attrs) {
				td.attrs.forEach((attr: any) => {
					if (attr.name == "class" && attr.value.split(" ").includes(cellIdentifier)) {
						if (valueType == "#text") {
							// console.log(cellIdentifier);
							let texts: {[key: string]: any}[] = this.getHTMLElements(td, "#text");

							if (texts.length) {
								value = texts.map((txt) => txt.value.trim()).join(" ");
								return;
							}
						} else if (valueType == "a") {
							let a = this.getHTMLElements(td, "a");
							if (a.length) {
								//we are assuming that there will be only one <a> in one <td>
								value = a[0].attrs.filter((a_attr: any) => a_attr.name == "href")[0]["value"];
								return;
							}
						}
					}
				});
			}
		});
		return value;
	}
	private getFullName(document: object, identifier: string): string {
		const divs: {[key: string]: any}[] = this.getHTMLElements(document, "div");
		const identifierRegex = new RegExp(identifier, "i");

		let filteredDiv = divs.filter((div: {[key: string]: any}) => {
			return (
				div.attrs.filter(
					(attr: {[key: string]: any}) => attr.name == "id" && attr.value.search(identifierRegex) != -1
				).length != 0
			);
		});

		const h2 = this.getHTMLElements(filteredDiv[0], "h2");
		const span = this.getHTMLElements(h2[0], "span");
		const texts = this.getHTMLElements(span[0], "#text");
		return texts
			.map((txt) => txt.value.trim())
			.join(" ")
			.trim();
	}
	public async tableRowToRoom(tr: object, document: object, building: Building): Promise<Room> {
		const number = this.getCellValueFromTableRow(tr, "views-field-field-room-number", "#text");
		const capacity = this.getCellValueFromTableRow(tr, "views-field-field-room-capacity", "#text");
		const furniture = this.getCellValueFromTableRow(tr, "views-field-field-room-furniture", "#text");
		const type = this.getCellValueFromTableRow(tr, "views-field-field-room-type", "#text");
		const link = this.getCellValueFromTableRow(tr, "views-field-nothing", "a");

		const apiUrl = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team134/${encodeURIComponent(
			building.address
		)}`;
		const response = await fetchData(apiUrl);
		const fullName = this.getFullName(document, "building-info");

		const jsonResp = JSON.parse(response);
		const room: Room = new Room(
			fullName,
			building.code,
			number,
			`${building.code}_${number}`,
			building.address,
			jsonResp.lat,
			jsonResp.lon,
			parseInt(capacity),
			type,
			furniture,
			link
		);
		return room;
	}
}
