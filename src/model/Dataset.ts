// import {CourseSection} from "./CourseSection";

import {InsightDatasetKind} from "../controller/IInsightFacade";
import {CourseSection} from "./CourseSection";
import {Room} from "./Room";

export type IDatasetEntry = CourseSection | Room;

interface CourseSectionDataSet {
	id: string;
	kind: InsightDatasetKind.Sections;
	entries: CourseSection[];
}

interface RoomDataSet {
	id: string;
	kind: InsightDatasetKind.Rooms;
	entries: Room[];
}

export class Dataset {
	private id: string;
	private kind: InsightDatasetKind;
	private entries: IDatasetEntry[];

	constructor(id: string, kind: InsightDatasetKind) {
		this.id = id;
		this.kind = kind;
		this.entries = [];
	}

	// To handle the rooms as well
	// public static fromObject(obj: any): Dataset {
	// 	const dataset = new Dataset(obj.id, obj.kind);
	// 	obj.entries.forEach((entryObj: any) => {
	// 		let entries: IDatasetEntry;
	// 		if (obj.kind === InsightDatasetKind.Rooms) {
	// 			entries = new Room(
	// 				entryObj.fullname,
	// 				entryObj.shortname,
	// 				// ...
	// 			);
	// 		} else {
	// 			entries = new CourseSection(
	// 				entryObj.uuid,
	// 				// ...
	// 			);
	// 		}
	// 		dataset.addEntry(entries);
	// 	});
	// 	return dataset;
	// }

	public static fromObject(obj: any): Dataset {
		const dataset = new Dataset(obj.id, obj.kind);
		obj.entries.forEach((sectionObj: any) => {
			const section = new CourseSection(
				sectionObj.uuid,
				sectionObj.id,
				sectionObj.title,
				sectionObj.instructor,
				sectionObj.dept,
				sectionObj.avg,
				sectionObj.pass,
				sectionObj.fail,
				sectionObj.audit,
				sectionObj.year
			);
			dataset.addSection(section);
		});
		return dataset;
	}

	public getKind() {
		return this.kind;
	}

	public getID() {
		return this.id;
	}

	public isRoom(): this is RoomDataSet {
		return this.kind === InsightDatasetKind.Rooms;
	}

	public isSection(): this is CourseSectionDataSet {
		return this.kind === InsightDatasetKind.Sections;
	}

	public addSection(section: IDatasetEntry) {
		this.entries.push(section);
	}

	public getSections(): IDatasetEntry[] {
		return this.entries;
	}
}
