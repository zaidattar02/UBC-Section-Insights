import JSZip from "jszip";
import {Dataset} from "../model/Dataset";
import fs from "fs-extra";
import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
import * as parse5 from "parse5";
import {Building} from "../model/Building";
import {Room, RoomKeyList} from "../model/Room";
import {fetchData} from "./HttpService";
import {IDatasetProcessor} from "./IDatasetProcessor";
import {assertTrue} from "./Assertions";

export class RoomsDatasetProcessor implements IDatasetProcessor {
	public async processDataset(id: string, content: string, kind: InsightDatasetKind): Promise<Dataset<Room>> {
		try {
			const zip = new JSZip();
			const data = await zip.loadAsync(content, {base64: true});
			const indexFile = data.file("index.htm");

			// Index.htm should exists
			if (!indexFile) {
				throw new InsightError("Invalid Data Index.htm not found");
			}
			// valid rooms folder structure should exists
			const buildingFilesFolder = await data.folder(new RegExp("campus/discover/buildings-and-classrooms"));

			if (!buildingFilesFolder) {
				throw new InsightError("Invalid Data");
			}
			// Atleast should have a file with room info
			if (buildingFilesFolder.length === 0) {
				throw new InsightError("Invalid Data Should Contain Atleast 1 Room");
			}

			const htmlFileContent = await indexFile.async("string");

			// Parse the HTML content using Parse5
			const document = parse5.parse(htmlFileContent);
			const buildingList: Building[] = this.getBuildingList(document);

			const listOfRoomList: Room[][] = await Promise.all(
				buildingList.map(async (building: Building) => {
					const roomList: Room[] = await this.getRoomList(data, building);
					return roomList;
				})
			);

			const allRooms: Room[] = listOfRoomList.flatMap((row) => row);
			if (allRooms.length === 0) {
				throw new InsightError("No Room Found.Need Atleast 1 Room");
			}

			const dataset: Dataset<Room> = new Dataset(id, kind);
			allRooms.forEach((room: Room) => {
				dataset.addEntry(room);
			});

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
		const fileUrl = building.link.replace(/^\.\//, "");
		const buildingFile = data.file(fileUrl);
		const roomList: Room[] = [];
		if (buildingFile) {
			const buildingFileContent = await buildingFile.async("string");
			const document = parse5.parse(buildingFileContent);
			const roomTable: {[key: string]: any} = this.getTable(document, "views-field-field-room-number");
			const tableRows = this.getHTMLElements(roomTable, "tr");
			tableRows.shift(); // removing table headers
			return await Promise.all(
				tableRows.map(async (tr, index) => {
					try {
						const roomValue = await this.tableRowToRoom(tr, document, building);
						// console.log("Room value:", roomValue);
						return roomValue;
					} catch (error) {
						console.error("Error in tableRowToRoom:", error);
						throw error;
					}
				})
			);
		}
		return roomList;
	}

	public getHTMLElements(document: object, tag: string): Array<{[key: string]: any}> {
		const elements: Array<[{[key: string]: any}]> = [];
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
		const tables: Array<{[key: string]: any}> = this.getHTMLElements(document, "table");

		let filteredTables = tables.filter((table) =>
			this.getHTMLElements(table, "td")
				.flatMap((td) => td.attrs)
				.some((attr) => attr.name === "class" && new RegExp(identifier, "i").test(attr.value))
		);

		return filteredTables && filteredTables.length !== 0 ? filteredTables[0] : [];
	}

	private getCellValueFromTableRow(tr: {[key: string]: any}, cellIdentifier: string, valueType: string): string {
		let value = "";
		let tds = this.getHTMLElements(tr, "td");
		tds.find((td: any) => {
			if (td.attrs) {
				const attr = td.attrs.find(
					(_attr: any) => _attr.name === "class" && _attr.value.split(" ").includes(cellIdentifier)
				);

				if (attr) {
					if (valueType === "#text") {
						const texts = this.getHTMLElements(td, "#text");
						if (texts.length) {
							value = texts.map((txt) => txt.value.trim()).join(" ");
							return true;
						}
					} else if (valueType === "a") {
						const a = this.getHTMLElements(td, "a");
						if (a.length) {
							value = a[0].attrs.find((a_attr: any) => a_attr.name === "href")?.value;
							return true;
						}
					}
				}
			}
		});
		return value;
	}

	private getFullName(document: object, identifier: string): string {
		const divs: Array<{[key: string]: any}> = this.getHTMLElements(document, "div");
		const identifierRegex = new RegExp(identifier, "i");

		let filteredDiv = divs.filter((div: {[key: string]: any}) => {
			return (
				div.attrs.filter(
					(attr: {[key: string]: any}) => attr.name === "id" && attr.value.search(identifierRegex) !== -1
				).length !== 0
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

		assertTrue(
			!!number && !!capacity && !!furniture && !!type && !!building.address,
			"Invalid Room Details Found",
			InsightError
		);

		const apiUrl = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team134/${encodeURIComponent(
			building.address
		)}`;
		let responseJson: {lat: number; lon: number};

		try {
			const response = await fetchData(apiUrl);
			responseJson = JSON.parse(response);
			assertTrue(
				Object.prototype.hasOwnProperty.call(responseJson, "lat") &&
					Object.prototype.hasOwnProperty.call(responseJson, "lon"),
				"Invalid Room Details Found",
				InsightError
			);
		} catch (e) {
			console.log(e);

			throw new InsightError("Not Able to fetch Lat Long for the room");
		}

		const fullName = this.getFullName(document, "building-info");

		const room: Room = new Room(
			fullName,
			building.code,
			number,
			`${building.code}_${number}`,
			building.address,
			responseJson.lat,
			responseJson.lon,
			parseInt(capacity,10),
			type,
			furniture,
			link
		);
		return room;
	}
}
