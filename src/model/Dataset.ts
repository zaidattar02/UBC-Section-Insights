import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
import {assertTrue} from "../service/Assertions";
import {CourseSection, createCourseSection} from "./CourseSection";
import {Room} from "./Room";

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

export interface IDatasetEntry {
	[key: string]: string | number;
}

export class Dataset<T extends IDatasetEntry> {
	protected id: string;
	protected kind: InsightDatasetKind;
	private entries: T[];

	constructor(id: string, kind: InsightDatasetKind) {
		this.id = id;
		this.kind = kind;
		this.entries = [];
	}

	public static fromObject(raw_obj: unknown): Dataset<CourseSection | Room> {
		assertTrue(typeof raw_obj === "object" && raw_obj !== null, "Invalid object", InsightError);
		const obj = raw_obj as any;
		assertTrue(typeof obj.id === "string", "Invalid id", InsightError);
		assertTrue(typeof obj.kind === "string" && Object.values(InsightDatasetKind).includes(obj.kind),
			"Invalid kind", InsightError);
		assertTrue(Array.isArray(obj.entries), "Invalid entries", InsightError);
		const validatedObject = obj as {id: string, kind: InsightDatasetKind, entries: unknown[]};

		if (validatedObject.kind === InsightDatasetKind.Rooms) {
			const dataset = new Dataset<Room>(validatedObject.id, validatedObject.kind);
			throw new Error("Not implemented");
			return dataset;
		} else if (validatedObject.kind === InsightDatasetKind.Sections) {
			const dataset = new Dataset<CourseSection>(validatedObject.id, validatedObject.kind);
			validatedObject.entries.forEach((sectionObj: any) => {
				const section = createCourseSection(
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
				dataset.addEntry(section);
			});
			return dataset;
		} else {
			throw new Error("Invalid kind");
		}
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

	public addEntry(section: T) {
		this.entries.push(section);
	}

	public getEntries(): T[] {
		return this.entries;
	}
}
